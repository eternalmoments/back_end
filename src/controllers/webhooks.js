import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log("LOGANDO WEBHOOK",event);
    
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

        // Update user's stripe customer ID and subscription status
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            subscription_status: 'active'
          })
          .eq('id', session.client_reference_id);

        if (updateError) throw updateError;

        // Record subscription details
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: session.user.id,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            status: 'active',
            current_period_end: new Date(session.subscription_data.trial_end * 1000)
          });

        if (subscriptionError) throw subscriptionError;
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) throw error;
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (subscriptionError) throw subscriptionError;

        // Update user's subscription status
        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (subscriptionData) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ subscription_status: 'inactive' })
            .eq('id', subscriptionData.user_id);

          if (profileError) throw profileError;
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
