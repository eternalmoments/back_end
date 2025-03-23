import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import profileRouter  from './src/routes/profileRouter.js'
import SitesRoutes from './src/routes/sites.roter.js';
import StarChartrouter from './src/routes/starchartroute.js';
import photosRouter from './src/routes/photosRouter.js';
import webHookRouter from './src/routes/webhooks.js';
import subsCriptionsRouter from './src/routes/subscriptions.js';
dotenv.config();

const app = express();

app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use('/api/webhook',webHookRouter);
app.use(cors());
app.use(express.json());


console.log("LOGANDO PRICEIDS NO INDEX", process.env.VITE_STRIPE_PRICE_ID_3,process.env.VITE_STRIPE_PRICE_ID_2,process.env.VITE_STRIPE_PRICE_ID_1);

app.use('/api/subs/',subsCriptionsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/profile', profileRouter);
app.use('/api/sites', SitesRoutes);
app.use('/api/star_chart', StarChartrouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});