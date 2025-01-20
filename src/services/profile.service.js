import { supabase } from '../config/supabase.js';

export default async function updateSubscriptionStatus(userId, status) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ subscription_status: status })
    .eq('id', userId);

  if (error) {
    console.error('Error updating subscription status:', error);
    throw new Error('Failed to update subscription status');
  }

  return data;
}
