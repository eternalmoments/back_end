import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';
import { updateSubscription } from './profile.controller.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export const createCheckoutSession = async (req, res) => {
  const { subscriptionPriceId,priceId, successUrl, cancelUrl, customerId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
        {
          price:subscriptionPriceId,
          quantity:1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId,
      client_reference_id: req.user.userId // Changed from req.user.id to match auth middleware
    });

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
