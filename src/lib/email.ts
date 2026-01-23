const SMTP2GO_API_KEY = process.env.SMTP2GO_API_KEY;
const SENDER_EMAIL = "Soluções AMLMF <noreply@solucoesamlmf.com>";

interface EmailPayload {
  to: string[];
  subject: string;
  html_body: string;
}

export async function sendEmail(payload: EmailPayload) {
  if (!SMTP2GO_API_KEY || SMTP2GO_API_KEY === "YOUR_API_KEY_HERE") {
    console.error("SMTP2GO_API_KEY is not set. Email not sent.");
    // No modo de desenvolvimento, logamos o payload para depuração.
    if (process.env.NODE_ENV === "development") {
      console.log("--- EMAIL PAYLOAD (Not Sent) ---");
      console.log(`To: ${payload.to.join(", ")}`);
      console.log(`Subject: ${payload.subject}`);
      console.log("--- Body ---");
      console.log(payload.html_body);
      console.log("---------------------------------");
      return {
        success: true,
        message: "Email logged to console in development mode.",
      };
    }
    // Em produção, falha silenciosamente, mas registra um erro no servidor.
    return {
      success: false,
      message: "API key for email service is missing.",
    };
  }

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

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send email via SMTP2GO:", errorData);
      return {
        success: false,
        message: `Email API error: ${errorData?.error_message}`,
      };
    }

    const data = await response.json();
    if (data.data?.failures?.length > 0) {
      console.error(
        "Email failed to send to some recipients:",
        data.data.failures
      );
      return {
        success: false,
        message: "Email failed to send to some recipients.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      message: "An unexpected error occurred while sending email.",
    };
  }
}
