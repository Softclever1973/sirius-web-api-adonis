import transport from '../config/mail.js';

export async function sendPasswordResetEmail(email, nome, token, baseUrl) {
    const link = `${baseUrl}/reset-senha.html?token=${token}`;

    await transport.sendMail({
        from: `SIRIUS WEB <${process.env.AUTH_EMAIL}>`,
        to: email,
        subject: 'Redefinição de Senha - SIRIUS WEB',
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;padding:40px;border-radius:12px;">
                <h2 style="color:#667eea;margin:0 0 8px 0;">SIRIUS WEB</h2>
                <p style="color:#94a3b8;font-size:13px;margin:0 0 32px 0;">Sistema de Gestão Empresarial</p>
                <p style="color:#e2e8f0;font-size:15px;">Olá, <strong>${nome}</strong>!</p>
                <p style="color:#94a3b8;font-size:14px;line-height:1.6;">
                    Recebemos uma solicitação para redefinir a senha da sua conta.<br>
                    Clique no botão abaixo para criar uma nova senha:
                </p>
                <div style="text-align:center;margin:32px 0;">
                    <a href="${link}"
                       style="display:inline-block;background:#667eea;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                        Redefinir Senha
                    </a>
                </div>
                <p style="color:#64748b;font-size:13px;">Este link expira em <strong>1 hora</strong>.</p>
                <p style="color:#64748b;font-size:13px;">Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece a mesma.</p>
                <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0;">
                <p style="color:#334155;font-size:12px;text-align:center;">
                    SIRIUS WEB © ${new Date().getFullYear()} — SoftClever
                </p>
            </div>
        `
    });
}
