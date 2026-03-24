import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transport = nodemailer.createTransport({
    host: process.env.AUTH_HOST,
    port: process.env.AUTH_PORT,
    secure: false,
    auth:{
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASSWORD,
    }
});

/*transport.sendMail({
    from: `Victor SoftClever <${process.env.AUTH_EMAIL}>`,
    to: 'henriquetezzei@softclever.com.br',
    subject: 'Enviando email com nodemailer',
    html: '<h1>Olá, Henrique</h1>',
    text: 'Olá Henrique',
}).then(() => console.log('Email enviado com sucesso'))
.catch((err) => console.log('Erro ao enviar o email: ', err));*/

export default transport;