import express from 'express';
import Stripe from 'stripe';
import auth from '../middleware/auth.js';

const router = express.Router();


router.post('/create-checkout-session', auth);

router.post('/create-portal-session', auth);

export default router;