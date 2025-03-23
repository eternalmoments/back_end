import express from 'express';
import {
    getSubscriptionByUserId,
    deductSiteFromSubscription
} from '../controllers/subscriptions.js';


const router = express.Router();
router.get("/get_sub_by_user/:user_id", getSubscriptionByUserId);
router.delete("/deduct_site/:user_id",deductSiteFromSubscription);



export default router;