import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import profileRouter  from './src/routes/profileRouter.js'
import SitesRoutes from './src/routes/sites.roter.js';
import StarChartrouter from './src/routes/starchartroute.js'

dotenv.config();

const app = express();

app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(cors());
app.use(express.json());





app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/profile', profileRouter);
app.use('/api/sites', SitesRoutes);
app.use('/api/star_chart', StarChartrouter);
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    // Ignorar o processamento JSON para o webhook
    next();
  } else {
    express.json()(req, res, next);
  }
});


app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});