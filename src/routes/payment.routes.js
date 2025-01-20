import express from 'express';
import { createCheckoutSession, createPortalSession, handleWebhook } from '../controllers/payment.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/create-checkout-session', authenticateToken, createCheckoutSession);
router.post('/create-portal-session', authenticateToken, createPortalSession);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;