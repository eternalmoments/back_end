import app from '../index.js';

export default async (req, res) => {
  console.log(`Recebida requisição: ${req.method} ${req.url}`);
  
  try {
    await app(req, res);
  } catch (error) {
    console.error('ERRO NA FUNÇÃO:', {
      error: error.message,
      stack: error.stack,
      req: {
        method: req.method,
        url: req.url,
        headers: req.headers
      }
    });
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
};