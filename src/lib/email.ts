const SMTP2GO_API_KEY = process.env.SMTP2GO_API_KEY;
const SENDER_EMAIL = "Soluções AMLMF <tiamlmf@hotmail.com>";

interface EmailPayload {
  to: string[];
  subject: string;
  html_body: string;
}

export async function sendEmail(payload: EmailPayload) {
  console.log("--- Iniciando envio de e-mail ---");

  if (!SMTP2GO_API_KEY || SMTP2GO_API_KEY === "YOUR_API_KEY_HERE") {
    console.error("AVISO: A chave da API SMTP2GO não está configurada no arquivo .env.local ou o servidor não foi reiniciado.");
    console.error("Nenhum e-mail real será enviado. O conteúdo do e-mail será exibido abaixo para fins de depuração.");

    if (process.env.NODE_ENV === "development") {
      console.log("--- PAYLOAD DO E-MAIL (Não enviado) ---");
      console.log(`Para: ${payload.to.join(", ")}`);
      console.log(`Assunto: ${payload.subject}`);
      console.log("--- Corpo (texto) ---");
      console.log(payload.html_body.replace(/<[^>]*>?/gm, ''));
      console.log("---------------------------------");
      return {
        success: true,
        message: "E-mail registrado no console no modo de desenvolvimento. Nenhuma API foi chamada.",
      };
    }
    
    return {
      success: false,
      message: "A chave da API para o serviço de e-mail está ausente.",
    };
  }

  console.log("Chave da API SMTP2GO encontrada. Tentando enviar e-mail...");

  try {
    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: SMTP2GO_API_KEY,
        sender: SENDER_EMAIL,
        to: payload.to,
        subject: payload.subject,
        html_body: payload.html_body,
      }),
    });

    const responseText = await response.text();
    let responseData;
    try {
        responseData = JSON.parse(responseText);
    } catch {
        console.error("Resposta da API SMTP2GO não é um JSON válido:", responseText);
        return {
            success: false,
            message: `Resposta inesperada da API de e-mail: ${responseText}`,
        };
    }

    if (!response.ok) {
      console.error("Falha ao enviar e-mail via SMTP2GO:", responseData);
      return {
        success: false,
        message: `Erro da API de e-mail: ${responseData?.error_message || 'Erro desconhecido'}`,
      };
    }

    if (responseData.data?.failures?.length > 0) {
      console.error(
        "E-mail falhou ao enviar para alguns destinatários:",
        responseData.data.failures
      );
      return {
        success: false,
        message: "E-mail falhou ao enviar para alguns destinatários.",
      };
    }

    console.log("E-mail enviado com sucesso via SMTP2GO. Request ID:", responseData.request_id);
    return { success: true };
  } catch (error)
  {
    console.error("Erro inesperado ao enviar e-mail:", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao enviar o e-mail.",
    };
  }
}
