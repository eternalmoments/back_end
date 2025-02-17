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

export const getSubscriptionByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id é obrigatório' });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error) {
      console.error('Erro ao buscar assinatura:', error);
      return res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }

    if (!data) {
      return res.status(404).json({ message: 'Nenhuma assinatura encontrada para este usuário' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};