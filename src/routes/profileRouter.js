import express from 'express';
import { updateSubscription } from '../controllers/profile.controller.js';

const router = express.Router();

router.put('/update-subscription', updateSubscription);

export default router;
