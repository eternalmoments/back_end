import express from 'express';
import  {getSitesByUser ,
         viewSite
}  from '../controllers/sites.controller.js';

const router = express.Router();


router.get('/getSitesByUser', getSitesByUser);
router.get('/viewSite/:id', viewSite); 

export default router;
