
"use server";

import { sendEmail } from "@/lib/email";

// Auxiliar para converter quebras de linha simples em HTML <br/> se não houver tags HTML
function formatBody(text: string): string {
    if (!text) return "";
    // Se o texto já parece HTML (tem tags básicas como <div>, <table>, <html> ou <p>), retorna como está
    if (/<(div|table|html|p|body|table|tr|td|span)[^>]*>/i.test(text)) {
        return text;
    }
    // Caso contrário, converte quebras de linha em <br/>
    return text.replace(/\n/g, "<br/>");
}

interface TicketCreatedPayload {
  ticketNumber: number;
  title: string;
  userName: string;
  userEmail: string;
  ccEmail?: string;
  description: string;
  type: 'support' | 'purchase';
  customTemplates?: {
    subject: string;
    body: string;
  };
}

export async function triggerTicketCreatedEmail(payload: TicketCreatedPayload) {
  try {
    const recipients = [payload.userEmail];
    if (payload.ccEmail) {
      recipients.push(payload.ccEmail);
    }

    let subjectTemplate = payload.customTemplates?.subject;
    let bodyTemplate = payload.customTemplates?.body;

    // Default templates if none provided
    if (!subjectTemplate || !bodyTemplate) {
        if (payload.type === 'purchase') {
            subjectTemplate = subjectTemplate || `Solicitação de Compra Enviada: #{{numero}}`;
            bodyTemplate = bodyTemplate || `
                <div style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, sans-serif; color: #333333;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 20px 0;">
                        <tr>
                            <td align="center">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                                    <tr>
                                        <td align="center" style="padding: 30px 20px; background-color: #ffffff; border-bottom: 2px solid #f0f2f5;">
                                            <img src="https://i.imgur.com/pRGzfc7.png" alt="Logo" width="70" style="display: block; border: 0;">
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <h1 style="color: #1a202c; font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 20px;">Olá, {{nome}}!</h1>
                                            <p style="font-size: 16px; line-height: 1.5; color: #4a5568; margin-bottom: 25px;">
                                                Sua solicitação de compra <strong style="color: #e25b3e;">#{{numero}}</strong> – <strong style="color: #2d3748;">{{titulo}}</strong> foi enviada para o TI!
                                            </p>
                                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-left: 4px solid #e25b3e; border-radius: 0 6px 6px 0; margin-bottom: 30px;">
                                                <tr>
                                                    <td style="padding: 15px 20px; font-size: 15px; color: #4a5568; line-height: 1.6;">
                                                        {{descricao}}
                                                    </td>
                                                </tr>
                                            </table>
                                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #edf2f7; border: 1px solid #e2e8f0; border-radius: 6px;">
                                                <tr>
                                                    <td style="padding: 15px 20px; font-size: 14px; color: #4a5568; text-align: center;">
                                                        ⏳ Agora passará por <strong>validação do gestor</strong>!
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding: 20px; background-color: #f8fafc; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7;">
                                            Sistema de Notificações &bull; Todos os direitos reservados
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </div>
            `;
        } else {
            subjectTemplate = subjectTemplate || `Chamado Aberto com Sucesso: #{{numero}}`;
            bodyTemplate = bodyTemplate || `
                <div style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, sans-serif; color: #333333;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 20px 0;">
                        <tr>
                            <td align="center">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                                    <tr>
                                        <td align="center" style="padding: 30px 20px; background-color: #ffffff; border-bottom: 2px solid #f0f2f5;">
                                            <img src="https://i.imgur.com/pRGzfc7.png" alt="Logo" width="70" style="display: block; border: 0;">
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <h1 style="color: #1a202c; font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 20px;">Olá, {{nome}}!</h1>
                                            <p style="font-size: 16px; line-height: 1.5; color: #4a5568; margin-bottom: 25px;">
                                                Seu chamado de número <strong style="color: #e25b3e;">{{numero}}</strong> – <strong style="color: #2d3748;">{{titulo}}</strong> foi aberto com sucesso!
                                            </p>
                                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-left: 4px solid #e25b3e; border-radius: 0 6px 6px 0; margin-bottom: 30px;">
                                                <tr>
                                                    <td style="padding: 15px 20px; font-size: 15px; color: #4a5568; line-height: 1.6;">
                                                        {{descricao}}
                                                    </td>
                                                </tr>
                                            </table>
                                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffaf0; border: 1px solid #feebc8; border-radius: 6px;">
                                                <tr>
                                                    <td style="padding: 15px 20px; font-size: 14px; color: #9c4221; text-align: center;">
                                                        💡 Agora você pode informar o número no <strong>Whatsapp do TI</strong>!
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding: 20px; background-color: #f8fafc; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7;">
                                            Sistema de Notificações &bull; Todos os direitos reservados
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </div>
            `;
        }
    }

    const finalSubject = subjectTemplate
        .replace(/{{numero}}/g, String(payload.ticketNumber))
        .replace(/{{titulo}}/g, payload.title)
        .replace(/{{nome}}/g, payload.userName)
        .replace(/{{descricao}}/g, payload.description);

    const finalBody = formatBody(bodyTemplate)
        .replace(/{{numero}}/g, String(payload.ticketNumber))
        .replace(/{{titulo}}/g, payload.title)
        .replace(/{{nome}}/g, payload.userName)
        .replace(/{{descricao}}/g, payload.description);

    await sendEmail({
      to: recipients,
      subject: finalSubject,
      html_body: finalBody,
    });
  } catch (error) {
    console.error("Error in triggerTicketCreatedEmail:", error);
  }
}

interface TicketCreatedSupportPayload {
  ticketNumber: number;
  title: string;
  creatorName: string;
  supportEmails: string[];
  description: string;
  customTemplates?: {
    subject: string;
    body: string;
  };
}

export async function triggerTicketCreatedSupportEmail(payload: TicketCreatedSupportPayload) {
    if (payload.supportEmails.length === 0) return;
    try {
        let subjectTemplate = payload.customTemplates?.subject || `NOVO CHAMADO #{{numero}}: {{titulo}}`;
        let bodyTemplate = payload.customTemplates?.body || `
            <div style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, sans-serif; color: #333333;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 20px 0;">
                    <tr>
                        <td align="center">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                                <tr>
                                    <td align="center" style="padding: 30px 20px; background-color: #ffffff; border-bottom: 2px solid #f0f2f5;">
                                        <img src="https://i.imgur.com/pRGzfc7.png" alt="Logo" width="70" style="display: block; border: 0;">
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 40px 30px;">
                                        <h1 style="color: #1a202c; font-size: 20px; font-weight: bold; margin-top: 0; margin-bottom: 10px;">Novo Chamado no Portal</h1>
                                        <p style="font-size: 15px; color: #4a5568; margin-bottom: 25px;">
                                            Um novo chamado foi aberto e precisa de atenção.
                                        </p>
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 25px;">
                                            <tr>
                                                <td style="padding: 20px;">
                                                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                                        <tr>
                                                            <td style="padding-bottom: 10px; font-size: 14px; color: #718096; width: 110px;"><strong>Criado por:</strong></td>
                                                            <td style="padding-bottom: 10px; font-size: 14px; color: #2d3748;">{{nome}}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding-bottom: 10px; font-size: 14px; color: #718096;"><strong>Número:</strong></td>
                                                            <td style="padding-bottom: 10px; font-size: 14px; color: #e25b3e; font-weight: bold;">#{{numero}}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding-bottom: 0; font-size: 14px; color: #718096;"><strong>Título:</strong></td>
                                                            <td style="padding-bottom: 0; font-size: 14px; color: #2d3748; font-weight: bold;">{{titulo}}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="font-size: 14px; font-weight: bold; color: #4a5568; margin-bottom: 8px;">Descrição:</p>
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-left: 4px solid #e25b3e; border-radius: 0 6px 6px 0; margin-bottom: 30px;">
                                            <tr>
                                                <td style="padding: 15px 20px; font-size: 14px; color: #4a5568; line-height: 1.6;">
                                                    {{descricao}}
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="font-size: 14px; color: #4a5568; margin-top: 30px; margin-bottom: 5px;">Atenciosamente,</p>
                                        <p style="font-size: 14px; font-weight: bold; color: #2d3748; margin-top: 0;">Sistema de Notificações do Portal</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px; background-color: #f8fafc; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7;">
                                        Sistema de Notificações &bull; Todos os direitos reservados
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>
        `;

        const finalSubject = subjectTemplate
            .replace(/{{numero}}/g, String(payload.ticketNumber))
            .replace(/{{titulo}}/g, payload.title)
            .replace(/{{nome}}/g, payload.creatorName)
            .replace(/{{descricao}}/g, payload.description);

        const finalBody = formatBody(bodyTemplate)
            .replace(/{{numero}}/g, String(payload.ticketNumber))
            .replace(/{{titulo}}/g, payload.title)
            .replace(/{{nome}}/g, payload.creatorName)
            .replace(/{{descricao}}/g, payload.description);

        await sendEmail({
            to: payload.supportEmails,
            subject: finalSubject,
            html_body: finalBody,
        });
    } catch (error) {
        console.error("Error in triggerTicketCreatedSupportEmail:", error);
    }
}

interface NewCommentPayload {
    recipientEmail: string;
    recipientName: string;
    ticketNumber: number;
    ticketTitle: string;
    commenterName: string;
    commentMessage: string;
}

export async function triggerNewCommentEmail(payload: NewCommentPayload) {
  try {
    await sendEmail({
      to: [payload.recipientEmail],
      subject: `Nova Resposta: Chamado #${payload.ticketNumber}`,
      html_body: `
            <div style="font-family: sans-serif; line-height: 1.6;">
                <p>Olá, <strong>${payload.recipientName}</strong>,</p>
                <p>Há uma nova interação no chamado <strong>#${payload.ticketNumber} - ${payload.ticketTitle}</strong>.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p><strong>${payload.commenterName}</strong> escreveu:</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #eee;">
                    ${formatBody(payload.commentMessage)}
                </div>
                <p>Para responder, acesse o portal de suporte.</p>
                <p>Atenciosamente,<br/>Equipe do Portal</p>
            </div>
        `,
    });
  } catch (error) {
    console.error("Error in triggerNewCommentEmail:", error);
  }
}

interface TicketResolvedPayload {
    userEmail: string;
    userName: string;
    ticketNumber: number;
    ticketTitle: string;
    ticketUrl: string;
}

export async function triggerTicketResolvedEmail(payload: TicketResolvedPayload) {
  try {
    await sendEmail({
      to: [payload.userEmail],
      subject: `Chamado Resolvido! #${payload.ticketNumber}`,
      html_body: `
            <div style="font-family: sans-serif; line-height: 1.6;">
                <h2>Olá, ${payload.userName}!</h2>
                <p>O seu chamado <strong>#${payload.ticketNumber} - ${payload.ticketTitle}</strong> foi marcado como <strong>Resolvido</strong>.</p>
                <p>Esperamos que a solução tenha sido satisfatória. Por favor, dedique 1 minuto para avaliar o nosso atendimento clicando no botão abaixo:</p>
                <p style="margin-top: 30px;">
                    <a href="${payload.ticketUrl}" style="background-color: #F97316; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">AVALIAR ATENDIMENTO</a>
                </p>
                <p style="font-size: 11px; color: #999; margin-top: 20px;">Caso o botão não funcione, utilize este link: <br/> ${payload.ticketUrl}</p>
                <p>Atenciosamente,<br/>Equipe de Suporte do Portal</p>
            </div>
        `,
    });
  } catch (error) {
    console.error("Error in triggerTicketResolvedEmail:", error);
  }
}
