import { supabase } from '../config/supabase.js';

/**
 * Fetch sites by user_id
 */
export const getSitesByUser = async (req, res) => {
  try {
    const { user_id } = req.query; // Front-end envia o user_id como query param

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Query no Supabase
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data); // Retorna os dados para o front-end
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const viewSite = async (req , res) => {
    const { id } = req.params;
    const { user_id } = req.query; // Assuma que o ID do usuário é enviado na query string

  if (!id || !user_id) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Obtenha o site
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('id, title, meeting_date, star_chart_url')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (siteError) throw siteError;
    if (!siteData) throw new Error('Site not found');

    // Obtenha as fotos
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, url, caption')
      .eq('site_id', id)
      .order('created_at', { ascending: true });

    if (photosError) throw photosError;

    // Obtenha as mensagens
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, content, position_x, position_y')
      .eq('site_id', id)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    res.json({
      ...siteData,
      photos: photos || [],
      messages: messages || [],
    });
  } catch (err) {
    console.error('Error fetching site:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }

}