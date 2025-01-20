import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import profileRouter  from './src/routes/profileRouter.js'
import SitesRoutes from './src/routes/sites.roter.js'
dotenv.config();

const app = express();


app.use(cors());
app.use(express.json());


app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));


app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/profile', profileRouter);
app.use('/api/sites', SitesRoutes);


app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});