import express from 'express';
import {
    getSubscriptionByUserId
} from '../controllers/subscriptions.js';


const router = express.Router();
router.get("/get_sub_by_user/:user_id", getSubscriptionByUserId)



export default router;