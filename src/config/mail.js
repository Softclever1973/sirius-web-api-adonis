// =====================================================
// CONFIGURAÇÃO NODEMAILER (SMTP)
// Desativado — Vercel bloqueia conexões SMTP de saída
// Manter para uso local ou migração futura
// =====================================================

// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';

// dotenv.config();

// const transport = nodemailer.createTransport({
//     host: process.env.AUTH_HOST,
//     port: process.env.AUTH_PORT,
//     secure: false,
//     auth:{
//         user: process.env.AUTH_EMAIL,
//         pass: process.env.AUTH_PASSWORD,
//     }
// });

// export default transport;