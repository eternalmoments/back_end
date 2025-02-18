import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';
import { updateSubscription } from './profile.controller.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export const createCheckoutSession = async (req, res) => {
  const { subscriptionPriceId, priceId, successUrl, cancelUrl, userId, mode } = req.body;

  try {
    // Verificar se o usuário já tem um cliente no Stripe
    let { data: userProfile, error: userError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    let customerId = userProfile?.stripe_customer_id;

    // Se o usuário não tem um Stripe Customer ID, criar um novo cliente
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId }
      });

      customerId = customer.id;

      // Salvar no banco de dados
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', userId);
    }

    // Definir os itens do checkout de acordo com a escolha do usuário
    let lineItems = [];

    if (mode === 'payment') {
      lineItems.push({ price: priceId, quantity: 1 });
    } else if (mode === 'subscription') {
      lineItems.push({ price: subscriptionPriceId, quantity: 1 });
    } else if (mode === 'combined') {
      // Caso o usuário escolha os dois produtos (único + assinatura)
      lineItems.push({ price: priceId, quantity: 1 });
      lineItems.push({ price: subscriptionPriceId, quantity: 1 });
    } else {
      return res.status(400).json({ error: "Modo de pagamento inválido." });
    }

    // Criar sessão de checkout no Stripe
    const session = await stripe.checkout.sessions.create({
      mode: mode === 'payment' ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId,
      client_reference_id: userId
    });

    console.log("LOG DA SESSION", session);
    
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};



export const createPortalSession = async (req, res) => {
  const { customerId } = req.body;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
};

export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Validar a assinatura do webhook usando o corpo bruto da requisição
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Processar os diferentes tipos de eventos enviados pelo Stripe
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object; // Objeto de sessão do Stripe
        const customerId = session.customer;

        // Atualizar o status da assinatura do cliente no Supabase
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'active' })
            .eq('id', profile.id);
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object; // Objeto de assinatura do Stripe
        const customerId = subscription.customer;

        // Atualizar o status da assinatura do cliente no Supabase
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          const status = subscription.status === 'active' ? 'active' : 'inactive';
          await supabase
            .from('profiles')
            .update({ subscription_status: status })
            .eq('id', profile.id);
        }
        break;
      }

      // Adicionar outros eventos relevantes do Stripe se necessário
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Confirmar o recebimento do webhook
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
