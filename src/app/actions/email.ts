
"use server";

import { sendEmail } from "@/lib/email";

// Auxiliar para converter quebras de linha simples em HTML <br/> se não houver tags HTML
function formatBody(text: string): string {
    if (!text) return "";
    // Se o texto já parece HTML (tem tags), retorna como está
    if (/<[a-z][\s\S]*>/i.test(text)) {
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
            subjectTemplate = subjectTemplate || `Confirmação de Solicitação de Compra #{{numero}}`;
            bodyTemplate = bodyTemplate || `
                <div style="font-family: sans-serif; line-height: 1.6;">
                    <h2>Olá, {{nome}}!</h2>
                    <p>Recebemos sua solicitação de compra <strong>#{{numero}} - {{titulo}}</strong>.</p>
                    <p><strong>Descrição dos itens:</strong></p>
                    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #F97316; font-style: italic;">
                        {{descricao}}
                    </div>
                    <p>Nossa equipe técnica e de suprimentos iniciará o processo de cotação. Você será notificado por e-mail sobre qualquer atualização no status.</p>
                    <p>Atenciosamente,<br/><strong>Equipe de Suporte e Compras</strong></p>
                </div>
            `;
        } else {
            subjectTemplate = subjectTemplate || `Chamado Aberto: #{{numero}} - {{titulo}}`;
            bodyTemplate = bodyTemplate || `
                <div style="font-family: sans-serif; line-height: 1.6;">
                    <h2>Olá, {{nome}}!</h2>
                    <p>Seu chamado <strong>#{{numero}} - {{titulo}}</strong> foi registrado com sucesso.</p>
                    <p><strong>Detalhes da solicitação:</strong></p>
                    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #ccc; font-style: italic;">
                        {{descricao}}
                    </div>
                    <p>Um técnico analisará sua solicitação em breve. Você pode acompanhar o andamento diretamente no nosso portal.</p>
                    <p>Atenciosamente,<br/><strong>Equipe de TI</strong></p>
                </div>
            `;
        }
    }

    // Replace variables in Subject
    const finalSubject = subjectTemplate
        .replace(/{{numero}}/g, String(payload.ticketNumber))
        .replace(/{{titulo}}/g, payload.title)
        .replace(/{{nome}}/g, payload.userName)
        .replace(/{{descricao}}/g, payload.description);

    // Replace variables in Body and ensure formatting
    const formattedBody = formatBody(bodyTemplate)
        .replace(/{{numero}}/g, String(payload.ticketNumber))
        .replace(/{{titulo}}/g, payload.title)
        .replace(/{{nome}}/g, payload.userName)
        .replace(/{{descricao}}/g, payload.description);

    await sendEmail({
      to: recipients,
      subject: finalSubject,
      html_body: formattedBody,
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
            <div style="font-family: sans-serif; line-height: 1.6;">
                <h2 style="color: #d946ef;">Novo Chamado no Portal</h2>
                <p>Um novo chamado foi aberto e precisa de atenção da equipe técnica.</p>
                <ul style="list-style: none; padding: 0;">
                    <li><strong>Solicitante:</strong> {{nome}}</li>
                    <li><strong>Número:</strong> #{{numero}}</li>
                    <li><strong>Título:</strong> {{titulo}}</li>
                </ul>
                <p><strong>Descrição:</strong></p>
                <div style="background: #f4f4f4; padding: 15px; border-left: 4px solid #d946ef;">
                    {{descricao}}
                </div>
                <p>Acesse o portal para atribuir este chamado a um técnico ou responder ao usuário.</p>
                <p>---<br/>Sistema de Notificações Automáticas</p>
            </div>
        `;

        // Replace variables in Subject
        const finalSubject = subjectTemplate
            .replace(/{{numero}}/g, String(payload.ticketNumber))
            .replace(/{{titulo}}/g, payload.title)
            .replace(/{{nome}}/g, payload.creatorName)
            .replace(/{{descricao}}/g, payload.description);

        // Replace variables in Body and ensure formatting
        const formattedBody = formatBody(bodyTemplate)
            .replace(/{{numero}}/g, String(payload.ticketNumber))
            .replace(/{{titulo}}/g, payload.title)
            .replace(/{{nome}}/g, payload.creatorName)
            .replace(/{{descricao}}/g, payload.description);

        await sendEmail({
            to: payload.supportEmails,
            subject: finalSubject,
            html_body: formattedBody,
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
