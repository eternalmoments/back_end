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
                const userId = session.client_reference_id;

                if (!userId) {
                    console.error("❌ ERRO: userId não encontrado no webhook.");
                    return res.status(400).json({ error: "UserId não encontrado no webhook." });
                }

                console.log("✅ DADOS DO USUÁRIO:", { userId, customerId });

      
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
                console.log("ITEMS COMPRADOS", lineItems);
                
                const purchasedItems = lineItems.data.map(item => item.price.id);

                console.log("PURCHASED ITEMS", purchasedItems);
                console.log("LOGANDO PRICEIDS .ENV", process.env.VITE_STRIPE_PRICE_ID_1 ,process.env.VITE_STRIPE_PRICE_ID_2,process.env.VITE_STRIPE_PRICE_ID_3);
                let sitesToAdd = 0;
                let activateSubscription = false;

                if (purchasedItems.includes(process.env.VITE_STRIPE_PRICE_ID_1)) {
                    sitesToAdd = 1; // Plano Básico
                } else if (purchasedItems.includes(process.env.VITE_STRIPE_PRICE_ID_2)) {
                    sitesToAdd = 3; // Plano Premium
                } else if (purchasedItems.includes(process.env.VITE_STRIPE_PRICE_ID_3)) {
                    sitesToAdd = 5; // Plano Exclusivo
                }
                console.log("LOGANDO SITES PARA CRIAR", sitesToAdd);
                
               // Se o usuário comprar a manutenção
                if (purchasedItems.includes(process.env.VITE_STRIPE_SUBSCRIPTION_PRICE_ID)) {
                    activateSubscription = true;
                }

                // Buscar o usuário na tabela `subscriptions`
                const { data: existingSubscription, error: fetchError } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                if (fetchError) {
                    console.error("❌ Erro ao buscar assinatura:", fetchError);
                    return res.status(500).json({ error: "Erro ao buscar assinatura." });
                }

                // Se o usuário já tem um registro, atualiza os dados
                if (existingSubscription) {
                    console.log("🔄 Atualizando assinatura existente...");

                    const updatedSites = existingSubscription.sites_to_create + sitesToAdd;

                    const { error: updateError } = await supabase
                        .from('subscriptions')
                        .update({
                            stripe_customer_id: customerId,
                            sites_to_create: updatedSites,
                            status: activateSubscription ? 'active' : existingSubscription.status
                        })
                        .eq('user_id', userId);

                    if (updateError) {
                        console.error("❌ Erro ao atualizar assinatura:", updateError);
                    } else {
                        console.log("✅ Assinatura atualizada com sucesso!");
                    }
                } else {
                    // Criar um novo registro de assinatura
                    console.log("➕ Criando nova assinatura para o usuário...");

                    const { error: subscriptionError } = await supabase
                        .from('subscriptions')
                        .insert([
                            {
                                user_id: userId,
                                stripe_customer_id: customerId,
                                sites_to_create: sitesToAdd,
                                status: activateSubscription ? 'active' : 'inactive'
                            },
                        ]);

                    if (subscriptionError) {
                        console.error("❌ Erro ao criar assinatura:", subscriptionError);
                    } else {
                        console.log("✅ Nova assinatura criada com sucesso!");
                    }
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
