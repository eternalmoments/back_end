import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
  
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log("LOGANDO WEBHOOK RECEBIDO:", event);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const customerId = session.customer;
          const subscriptionId = session.subscription;
          const userId = session.client_reference_id; // Pegando o userId corretamente
  
          if (!userId) {
            console.error("Erro: userId não encontrado no webhook.");
            return res.status(400).json({ error: "UserId não encontrado no webhook." });
          }
  
          console.log("LOGANDO USER DADOS:", userId, customerId,subscriptionId);
  
          // Verificar se o usuário já possui uma assinatura
          const { data: existingSubscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();
  
          if (existingSubscription) {
            console.log("Usuário já tem uma assinatura. Atualizando status...");
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({
                stripe_customer_id: customerId,
                status: 'active',
                current_period_end: session.expires_at
                  ? new Date(session.expires_at * 1000)
                  : null,
              })
              .eq('user_id', userId);
  
            if (updateError){
                console.log("ERRO DE UPDATE",updateError);
                
            }
          } else {
            console.log("Criando nova assinatura para o usuário...");
            const { error: subscriptionError } = await supabase
              .from('subscriptions')
              .insert([
                {
                  user_id: userId,
                  stripe_subscription_id: subscriptionId,
                  stripe_customer_id: customerId,
                  status: 'active',
                  current_period_end: session.expires_at
                    ? new Date(session.expires_at * 1000)
                    : null,
                },
              ]);
  
            if (subscriptionError) throw subscriptionError;
          }
  
          break;
        }
  
        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          console.log("Atualizando assinatura do usuário:", subscription.id);
  
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq('stripe_subscription_id', subscription.id);
  
          if (error) throw error;
          break;
        }
  
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          console.log("Cancelando assinatura:", subscription.id);
  
          const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date(),
            })
            .eq('stripe_subscription_id', subscription.id);
  
          if (subscriptionError) throw subscriptionError;
  
          break;
        }
      }
  
      res.json({ received: true });
    } catch (err) {
      console.error('Erro ao processar webhook:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  };
  