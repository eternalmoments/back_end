import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        console.log("🔹 WEBHOOK RECEBIDO:", event);
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const customerId = session.customer;
                const userId = session.client_reference_id || session.metadata?.userId;
            
                if (!userId) {
                    console.error("❌ ERRO: userId não encontrado no webhook.");
                    return res.status(400).json({ error: "UserId não encontrado no webhook." });
                }
            
                console.log("✅ DADOS DO USUÁRIO:", { userId, customerId });
            
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
                console.log("ITEMS COMPRADOS", lineItems);
                
                const purchasedItems = lineItems.data.map(item => item.price.id);
            
                console.log("PURCHASED ITEMS", purchasedItems);
                console.log("LOGANDO PRICEIDS .ENV", process.env.VITE_STRIPE_PRICE_ID_1, process.env.VITE_STRIPE_PRICE_ID_2, process.env.VITE_STRIPE_PRICE_ID_3);
                
                let sitesToAdd = 0;
                let activateSubscription = false;
                let stripeSubscriptionId = null;
            
           
                const isSubscriptionPurchase = purchasedItems.includes(process.env.VITE_STRIPE_SUBSCRIPTION_PRICE_ID);
                
                if (purchasedItems.includes(process.env.VITE_STRIPE_PRICE_ID_1)) {
                    sitesToAdd = 1; 
                } else if (purchasedItems.includes(process.env.VITE_STRIPE_PRICE_ID_2)) {
                    sitesToAdd = 3;
                } else if (purchasedItems.includes(process.env.VITE_STRIPE_PRICE_ID_3)) {
                    sitesToAdd = 5; 
                }
                
                if (isSubscriptionPurchase) {
                    activateSubscription = true;
                    
                    if (session.mode === 'subscription' || session.mode === 'combined') {
                        const subscriptions = await stripe.subscriptions.list({
                            customer: customerId,
                            limit: 1
                        });
                        
                        if (subscriptions.data.length > 0) {
                            stripeSubscriptionId = subscriptions.data[0].id;
                            console.log("📌 Subscription ID encontrado:", stripeSubscriptionId);
                        }
                    }
                }
            
                
                const { data: existingSubscription, error: fetchError } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', userId)
                    .single();
            
                if (fetchError && !existingSubscription) {
                    console.error("❌ Erro ao buscar assinatura:", fetchError);
                    return res.status(500).json({ error: "Erro ao buscar assinatura." });
                }
            
             
                const subscriptionData = {
                    stripe_customer_id: customerId,
                    sites_to_create: (existingSubscription?.sites_to_create || 0) + sitesToAdd,
                    status: activateSubscription ? 'active' : existingSubscription?.status || 'inactive'
                };
            
                
                if (stripeSubscriptionId) {
                    subscriptionData.stripe_subscription_id = stripeSubscriptionId;
                }
            
               
                if (existingSubscription) {
                    console.log("🔄 Atualizando assinatura existente...");
            
                    const { error: updateError } = await supabase
                        .from('subscriptions')
                        .update(subscriptionData)
                        .eq('user_id', userId);
            
                    if (updateError) {
                        console.error("❌ Erro ao atualizar assinatura:", updateError);
                    } else {
                        console.log("✅ Assinatura atualizada com sucesso!");
                    }
                } else {
                  
                    console.log("➕ Criando nova assinatura para o usuário...");
            
                    const { error: subscriptionError } = await supabase
                        .from('subscriptions')
                        .insert([{
                            user_id: userId,
                            ...subscriptionData
                        }]);
            
                    if (subscriptionError) {
                        console.error("❌ Erro ao criar assinatura:", subscriptionError);
                    } else {
                        console.log("✅ Nova assinatura criada com sucesso!");
                    }
                }
            
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                
                
                const { error: updateError } = await supabase
                    .from('subscriptions')
                    .update({
                        stripe_subscription_id: subscription.id,
                        status: subscription.status,
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
                    })
                    .eq('stripe_customer_id', subscription.customer);
            
                if (updateError) {
                    console.error("❌ Erro ao atualizar assinatura:", updateError);
                }
                break;
            }
            case 'checkout.session.async_payment_failed': {
                const session = event.data.object;
                const customerId = session.customer;
                const userId = session.client_reference_id || session.metadata?.userId;
            
                if (!userId) {
                    console.error("❌ ERRO: userId não encontrado no webhook de pagamento falhado.");
                    return res.status(400).json({ error: "UserId não encontrado" });
                }
            
                console.log("⚠️ Pagamento falhou para o usuário:", { userId, customerId });
            
                try {
                    // 1. Buscar a assinatura existente
                    const { data: existingSubscription, error: fetchError } = await supabase
                        .from('subscriptions')
                        .select('*')
                        .eq('user_id', userId)
                        .single();
            
                    if (fetchError) {
                        console.error("❌ Erro ao buscar assinatura:", fetchError);
                        return res.status(500).json({ error: "Erro ao buscar assinatura" });
                    }
            
                    // 2. Determinar o novo status baseado no tipo de pagamento
                    let newStatus = 'payment_failed';
                    let sitesToCreate = existingSubscription?.sites_to_create || 0;
            
                    // Se for uma assinatura recorrente que falhou
                    if (session.mode === 'subscription') {
                        newStatus = 'past_due';
                        
                        // Opcional: Reduzir sites disponíveis se quiser restringir acesso imediatamente
                        // sitesToCreate = Math.max(0, sitesToCreate - 1);
                    }
            
                  
                    const updateData = {
                        status: newStatus,
                        last_payment_error: new Date().toISOString(),
                        payment_error_details: JSON.stringify({
                            code: session.payment_intent?.last_payment_error?.code,
                            message: session.payment_intent?.last_payment_error?.message,
                            decline_code: session.payment_intent?.last_payment_error?.decline_code
                        })
                    };
            
                    
                    if (existingSubscription?.sites_to_create !== undefined) {
                        updateData.sites_to_create = sitesToCreate;
                    }
            
                    const { error: updateError } = await supabase
                        .from('subscriptions')
                        .update(updateData)
                        .eq('user_id', userId);
            
                    if (updateError) {
                        console.error("❌ Erro ao atualizar assinatura falhada:", updateError);
                        return res.status(500).json({ error: "Erro ao atualizar status" });
                    }
            
                    console.log("✅ Status atualizado para pagamento falhado:", newStatus);
            
                 
                    try {
                        await supabase
                            .from('payment_errors')
                            .insert({
                                user_id: userId,
                                stripe_session_id: session.id,
                                error_type: 'async_payment_failed',
                                error_details: updateData.payment_error_details,
                                amount: session.amount_total / 100, // Convertendo de centavos
                                currency: session.currency
                            });
                    } catch (historyError) {
                        console.error("⚠️ Erro ao registrar histórico de pagamento:", historyError);
                    }
            
                    // 5. Opcional: Enviar notificação por e-mail (integre com seu sistema de e-mails)
                    // await sendPaymentFailedEmail(userId, session);
            
                } catch (error) {
                    console.error("❌ Erro no processamento de pagamento falhado:", error);
                    return res.status(500).json({ error: "Erro interno no processamento" });
                }
            
                break;
            }
        }

        res.json({ received: true });
    } catch (err) {
        console.error('❌ Erro ao processar webhook:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};
