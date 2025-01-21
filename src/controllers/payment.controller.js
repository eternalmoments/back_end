import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';
import { updateSubscription } from './profile.controller.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export const createCheckoutSession = async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl, userId, mode } = req.body;
    console.log("LOGANDO PRICEID",priceId);
    
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    // If user doesn't have a Stripe customer ID, create one
    if (!customerId) {
      const { data: userData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          supabase_user_id: userId
        }
      });

      customerId = customer.id;

      // Update user profile with Stripe customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

export const createPortalSession = async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
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
