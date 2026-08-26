const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret && (process.env.NODE_ENV === 'production' || process.env.VERCEL)) {
    throw new Error('JWT_SECRET é obrigatório em produção.');
}

module.exports = {
    jwtSecret: jwtSecret || 'chave_local_apenas_para_desenvolvimento_senac'
};
