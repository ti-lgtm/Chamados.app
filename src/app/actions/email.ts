"use server";

import { sendEmail } from "@/lib/email";
import type { Ticket, Comment, AppUser } from "@/lib/types";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { initializeApp, getApp, getApps } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";

// Inicializa uma instância do Firebase no lado do servidor de forma segura para as Server Actions
function getDbOnServer() {
  const appName = "firebase-server-actions";
  if (!getApps().some((app) => app.name === appName)) {
    initializeApp(firebaseConfig, appName);
  }
  return getFirestore(getApp(appName));
}

export async function triggerTicketCreatedEmail(ticket: {
  id: string;
  ticketNumber: number;
  title: string;
  userId: string;
}) {
  try {
    const db = getDbOnServer();
    const userRef = doc(db, "users", ticket.userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || !userSnap.data().email) {
      console.error(`User ${ticket.userId} not found or has no email.`);
      return;
    }
    const user = userSnap.data() as AppUser;

    await sendEmail({
      to: [user.email],
      subject: `Chamado #${ticket.ticketNumber} Criado: ${ticket.title}`,
      html_body: `
            <h1>Olá ${user.name},</h1>
            <p>Seu chamado <strong>#${ticket.ticketNumber} - "${ticket.title}"</strong> foi criado com sucesso.</p>
            <p>Nossa equipe de suporte irá analisá-lo em breve. Você pode acompanhar o status do seu chamado em nosso portal.</p>
            <p>Atenciosamente,<br/>Equipe de Suporte Soluções AMLMF</p>
        `,
    });
  } catch (error) {
    console.error("Error in triggerTicketCreatedEmail:", error);
  }
}

export async function triggerNewCommentEmail(
  ticketId: string,
  comment: { userId: string; message: string; userName: string }
) {
  try {
    const db = getDbOnServer();
    const ticketRef = doc(db, "tickets", ticketId);
    const ticketSnap = await getDoc(ticketRef);

    if (!ticketSnap.exists()) {
      console.error(`Ticket ${ticketId} not found.`);
      return;
    }
    const ticket = ticketSnap.data() as Ticket;

    let recipientId: string | null = null;
    
    // Se o criador do chamado comentou, notifique o técnico responsável.
    if (comment.userId === ticket.userId) {
      if (ticket.assignedTo) {
        recipientId = ticket.assignedTo;
      }
    } else {
      // Se um técnico (ou qualquer outra pessoa) comentou, notifique o criador do chamado.
      recipientId = ticket.userId;
    }

    if (!recipientId) {
      console.log("No recipient for comment notification.");
      return;
    }

    const userRef = doc(db, "users", recipientId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || !userSnap.data().email) {
      console.error(`Recipient ${recipientId} not found or has no email.`);
      return;
    }
    const recipientUser = userSnap.data() as AppUser;

    await sendEmail({
      to: [recipientUser.email],
      subject: `Novo comentário no chamado #${ticket.ticketNumber}`,
      html_body: `
            <h1>Olá ${recipientUser.name},</h1>
            <p>Há uma nova resposta no chamado <strong>#${ticket.ticketNumber} - "${ticket.title}"</strong>.</p>
            <hr/>
            <p><strong>${comment.userName}</strong> comentou:</p>
            <blockquote style="border-left: 2px solid #ccc; padding-left: 1em; margin-left: 1em; font-style: italic;">${comment.message}</blockquote>
            <hr/>
            <p>Para ver o chamado completo, acesse o portal.</p>
            <p>Atenciosamente,<br/>Equipe de Suporte Soluções AMLMF</p>
        `,
    });
  } catch (error) {
    console.error("Error in triggerNewCommentEmail:", error);
  }
}

export async function triggerTicketResolvedEmail(ticketId: string) {
  try {
    const db = getDbOnServer();
    const ticketRef = doc(db, "tickets", ticketId);
    const ticketSnap = await getDoc(ticketRef);

    if (!ticketSnap.exists()) {
      console.error(`Ticket ${ticketId} not found.`);
      return;
    }
    const ticket = ticketSnap.data() as Ticket;

    const userRef = doc(db, "users", ticket.userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || !userSnap.data().email) {
      console.error(`User ${ticket.userId} not found or has no email.`);
      return;
    }
    const user = userSnap.data() as AppUser;

    await sendEmail({
      to: [user.email],
      subject: `Seu chamado #${ticket.ticketNumber} foi resolvido!`,
      html_body: `
            <h1>Olá ${user.name},</h1>
            <p>Boas notícias! Seu chamado <strong>#${ticket.ticketNumber} - "${ticket.title}"</strong> foi marcado como resolvido pela nossa equipe.</p>
            <p>Se o problema persistir ou se você tiver outra dúvida, sinta-se à vontade para abrir um novo chamado.</p>
            <p>Agradeceríamos muito se você pudesse dedicar um momento para <strong>avaliar o atendimento</strong> recebido diretamente na página do chamado em nosso portal.</p>
            <p>Atenciosamente,<br/>Equipe de Suporte Soluções AMLMF</p>
        `,
    });
  } catch (error) {
    console.error("Error in triggerTicketResolvedEmail:", error);
  }
}
