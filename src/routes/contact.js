import express from 'express';
import { sendContactEmail } from '../services/email.service.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        message: 'Todos os campos são obrigatórios' 
      });
    }

    await sendContactEmail({
      name,
      email,
      subject,
      message
    });

    res.status(200).json({ 
      message: 'Mensagem enviada com sucesso' 
    });
  } catch (error) {
    console.error('Error sending contact email:', error);
    res.status(500).json({ 
      message: 'Erro ao enviar mensagem. Por favor, tente novamente.' 
    });
  }
});

export default router;