import  updateSubscriptionStatus  from '../services/profile.service.js';

export const updateSubscription = async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!userId || !status) {
      return res.status(400).json({ error: 'Missing required fields: userId or status' });
    }

    const updatedProfile = await updateSubscriptionStatus(userId, status);
    return res.status(200).json({ message: 'Subscription status updated', updatedProfile });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
