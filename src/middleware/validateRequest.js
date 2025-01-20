export const validateRegister = (req, res, next) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ 
      message: 'Todos os campos são obrigatórios' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      message: 'A senha deve ter pelo menos 6 caracteres' 
    });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ 
      message: 'Formato de e-mail inválido' 
    });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      message: 'E-mail e senha são obrigatórios' 
    });
  }

  next();
};