import { supabase } from "../config/supabase.js";

export const uploadPhotoService = async (siteId, file) => {
  try {
    // Criar um nome único para o arquivo
    const fileExt = file.originalname.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${siteId}/${fileName}`;

    // Fazer o upload para o Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) throw uploadError;

    // Obter a URL pública da foto
    const { data } = supabase.storage.from("photos").getPublicUrl(filePath);
    const photoUrl = data.publicUrl;

    // Inserir na tabela `photos`
    const { error: dbError } = await supabase.from("photos").insert([
      {
        site_id: siteId,
        url: photoUrl,
        caption: "Foto adicionada automaticamente", // Pode ser editado depois
      },
    ]);

    if (dbError) throw dbError;

    return { success: true, message: "Foto adicionada com sucesso!", url: photoUrl };
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    throw new Error(error.message || "Erro ao fazer upload da foto");
  }
};
