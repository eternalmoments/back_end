import express from "express";
import multer from "multer";
import { uploadPhoto } from "../controllers/photos_controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Configura o multer para armazenar os arquivos na memória

router.post("/upload_photos", upload.single("photo"), uploadPhoto);

export default router;
