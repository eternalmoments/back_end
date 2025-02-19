import { supabase } from '../config/supabase.js';


export const getSubscriptionByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    console.log("LOGANDO USER_ID NA REQUEST DE SUB", user_id);
    
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
    console.log("DADOS SUBS",data);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};