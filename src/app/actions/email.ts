"use server";

import { sendEmail } from "@/lib/email";

interface TicketCreatedPayload {
  ticketNumber: number;
  title: string;
  userName: string;
  userEmail: string;
}

export async function triggerTicketCreatedEmail(payload: TicketCreatedPayload) {
  try {
    await sendEmail({
      to: [payload.userEmail],
      subject: `Chamado #${payload.ticketNumber} Criado: ${payload.title}`,
      html_body: `
            <h1>Olá ${payload.userName},</h1>
            <p>Seu chamado <strong>#${payload.ticketNumber} - "${payload.title}"</strong> foi criado com sucesso.</p>
            <p>Nossa equipe de suporte irá analisá-lo em breve. Você pode acompanhar o status do seu chamado em nosso portal.</p>
            <p>Atenciosamente,<br/>Equipe de Suporte Soluções AMLMF</p>
        `,
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
}

export async function triggerTicketCreatedSupportEmail(payload: TicketCreatedSupportPayload) {
    if (payload.supportEmails.length === 0) return;
    try {
        await sendEmail({
            to: payload.supportEmails,
            subject: `Novo Chamado Aberto: #${payload.ticketNumber} por ${payload.creatorName}`,
            html_body: `
                <h1>Novo Chamado no Portal</h1>
                <p>Um novo chamado foi aberto e precisa de atenção.</p>
                <ul>
                    <li><strong>Criado por:</strong> ${payload.creatorName}</li>
                    <li><strong>Número:</strong> #${payload.ticketNumber}</li>
                    <li><strong>Título:</strong> ${payload.title}</li>
                </ul>
                <p>Acesse o portal para ver os detalhes e atribuir o chamado.</p>
                <p>Atenciosamente,<br/>Sistema de Notificações AMLMF</p>
            `,
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
      subject: `Novo comentário no chamado #${payload.ticketNumber}`,
      html_body: `
            <h1>Olá ${payload.recipientName},</h1>
            <p>Há uma nova resposta no chamado <strong>#${payload.ticketNumber} - "${payload.ticketTitle}"</strong>.</p>
            <hr/>
            <p><strong>${payload.commenterName}</strong> comentou:</p>
            <blockquote style="border-left: 2px solid #ccc; padding-left: 1em; margin-left: 1em; font-style: italic;">${payload.commentMessage}</blockquote>
            <hr/>
            <p>Para ver o chamado completo, acesse o portal.</p>
            <p>Atenciosamente,<br/>Equipe de Suporte Soluções AMLMF</p>
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
}

export async function triggerTicketResolvedEmail(payload: TicketResolvedPayload) {
  try {
    await sendEmail({
      to: [payload.userEmail],
      subject: `Seu chamado #${payload.ticketNumber} foi resolvido!`,
      html_body: `
            <h1>Olá ${payload.userName},</h1>
            <p>Boas notícias! Seu chamado <strong>#${payload.ticketNumber} - "${payload.ticketTitle}"</strong> foi marcado como resolvido pela nossa equipe.</p>
            <p>Se o problema persistir ou se você tiver outra dúvida, sinta-se à vontade para abrir um novo chamado.</p>
            <p>Agradeceríamos muito se você pudesse dedicar um momento para <strong>avaliar o atendimento</strong> recebido diretamente na página do chamado em nosso portal.</p>
            <p>Atenciosamente,<br/>Equipe de Suporte Soluções AMLMF</p>
        `,
    });
  } catch (error) {
    console.error("Error in triggerTicketResolvedEmail:", error);
  }
}
