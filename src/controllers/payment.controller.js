import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';
import { updateSubscription } from './profile.controller.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export const createCheckoutSession = async (req, res) => {
  const { subscriptionPriceId, priceId, successUrl, cancelUrl, userId, mode } = req.body;

  try {
   
    let { data: userProfile, error: userError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    let customerId = userProfile?.stripe_customer_id;

    
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId }
      });

      customerId = customer.id;

     
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', userId);
    }

  
    let lineItems = [];

    if (mode === 'payment') {
      lineItems.push({ price: priceId, quantity: 1 });
    } else if (mode === 'subscription') {
      lineItems.push({ price: subscriptionPriceId, quantity: 1 });
    } else if (mode === 'combined') {
      
      lineItems.push({ price: priceId, quantity: 1 });
      lineItems.push({ price: subscriptionPriceId, quantity: 1 });
    } else {
      return res.status(400).json({ error: "Modo de pagamento inválido." });
    }

   
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
   
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
  
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;

        
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
        const subscription = event.data.object; 
        const customerId = subscription.customer;

        
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

     
      default:
        console.log(`Unhandled event type ${event.type}`);
    }


    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
