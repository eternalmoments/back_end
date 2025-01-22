import express from 'express';
import { getStarChart, getCelestialBodies } from '../controllers/Starchartcontroller.js';

const router = express.Router();

router.post('/star-chart', getStarChart);
router.get('/celestial-bodies', getCelestialBodies);

export default router;
