import { uploadPhotoService } from "../services/photoService.js";

export const uploadPhoto = async (req, res) => {
  try {
    const { siteId } = req.body; // Recebe o ID do site no corpo da requisição
    const file = req.file; // Arquivo enviado

    if (!siteId || !file) {
      return res.status(400).json({ error: "siteId e foto são obrigatórios." });
    }

    const response = await uploadPhotoService(siteId, file);
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
