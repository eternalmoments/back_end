import express from 'express';
import {
    getSubscriptionByUserId
} from '../controllers/subscriptions';


const router = express.Router();
router.get("/get_sub_by_user/:user_id", getSubscriptionByUserId)



export default router;