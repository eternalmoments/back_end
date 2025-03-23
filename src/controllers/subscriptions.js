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



export const deductSiteFromSubscription = async (req, res) => {
  try {
      const { user_id } = req.body;

      if (!user_id) {
          return res.status(400).json({ error: 'user_id é obrigatório' });
      }

  
      const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user_id)
          .single();

      if (error || !subscription) {
          return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      if (subscription.sites_to_create <= 0) {
          return res.status(400).json({ error: 'Você não tem sites disponíveis para criar.' });
      }

    
      const updatedSites = subscription.sites_to_create - 1;

      const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ sites_to_create: updatedSites })
          .eq('user_id', user_id);

      if (updateError) {
          return res.status(500).json({ error: 'Erro ao atualizar sites disponíveis' });
      }

      return res.status(200).json({ message: 'Site deduzido com sucesso', sites_to_create: updatedSites });

  } catch (error) {
      console.error('Erro interno:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};