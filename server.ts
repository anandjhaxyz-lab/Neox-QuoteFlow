import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/check-config", (req, res) => {
    res.json({
      resendConfigured: !!process.env.RESEND_API_KEY,
      firebaseConfigured: !!process.env.VITE_FIREBASE_API_KEY
    });
  });

  // API Route to send invitation email
  app.post("/api/send-invitation", async (req, res) => {
    const { email, companyName, role, inviteLink } = req.body;
    console.log(`[Invitation] Attempting to send to ${email} for ${companyName}`);

    try {
      const resendClient = getResend();
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      console.log(`[Invitation] Resend client initialized. Sending email from ${fromEmail}...`);
      
      const { data, error } = await resendClient.emails.send({
        from: fromEmail,
        to: [email],
        subject: `Invitation to join ${companyName} on QuoteFlow`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #2563eb;">Welcome to QuoteFlow!</h2>
            <p>Hello,</p>
            <p>You have been invited to join <strong>${companyName}</strong> as a <strong>${role}</strong>.</p>
            <p>QuoteFlow helps you create and manage professional quotations easily.</p>
            <div style="margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #6b7280; font-size: 14px;">${inviteLink}</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">This is an automated message from QuoteFlow.</p>
          </div>
        `,
      });

      if (error) {
        console.error("[Invitation] Resend error:", JSON.stringify(error, null, 2));
        
        // Provide more helpful message for common Resend sandbox errors
        let userMessage = error.message;
        if (error.name === 'validation_error' && fromEmail.includes('onboarding@resend.dev')) {
          userMessage = "Resend Sandbox Limit: You can only send emails to your own registered email address unless you verify a custom domain in Resend.";
        }
        
        return res.status(400).json({ 
          error: error.name, 
          message: userMessage,
          details: error 
        });
      }

      console.log(`[Invitation] Email sent successfully! ID: ${data?.id}`);
      res.status(200).json(data);
    } catch (err: any) {
      console.error("[Invitation] Server error:", err);
      res.status(500).json({ 
        error: "Internal server error", 
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
