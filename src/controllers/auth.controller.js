import { supabase } from '../config/supabase.js';
import jwt from 'jsonwebtoken';


export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, subscription_status: 'inactive' },
      },
    });

    if (authError) throw authError;

    
    const { error: subscriptionError } = await supabase.from('subscriptions').insert([
      {
        user_id: authData.user.id,
        stripe_subscription_id: '', 
        stripe_customer_id: '',
        status: 'inactive',
        current_period_end: null,    
      },
      
    ]);
   
    console.log("SUB CRIADA COM SUCESSO");
    if (subscriptionError) {
      console.error('Erro ao criar assinatura:', subscriptionError.message);
      throw new Error('Failed to create subscription');
    }
 
    const token = jwt.sign({ userId: authData.user.id }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ error: error.message });
  }
};



export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('LOGANDO DADOS DO LOGIN', authData);

    if (authError) throw authError;

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, subscription_status')
      .eq('id', authData.user.id)
      .single();

    const token = jwt.sign(
      { userId: authData.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );

    res.json({
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile?.name || authData.user.user_metadata?.name,
        subscriptionStatus: profile?.subscription_status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
};
