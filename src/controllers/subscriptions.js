import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { createSubscriptionService } from '../services/subscriptionService.js';

export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (authError) throw authError;

    // Criar uma nova assinatura após o usuário ser cadastrado
    await createSubscriptionService(authData.user.id);

    const token = jwt.sign(
      { userId: authData.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
      },
    });
  } catch (error) {
    console.error('Erro no signup:', error);
    res.status(400).json({ error: error.message });
  }
};
