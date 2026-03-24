import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import { config } from "dotenv";

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Drive API Setup
  const getDriveClient = () => {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      console.warn("GOOGLE_SERVICE_ACCOUNT_JSON is not set.");
      return null;
    }
    try {
      const credentials = JSON.parse(serviceAccountJson);
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/drive.readonly"]
      });
      return google.drive({ version: "v3", auth });
    } catch (e) {
      console.error("Failed to parse Google Service Account JSON", e);
      return null;
    }
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Hanraon API is running" });
  });

  app.get("/api/drive", async (req, res) => {
    const drive = getDriveClient();
    if (!drive) {
      return res.status(500).json({ error: "Google Drive not configured" });
    }

    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      const response = await drive.files.list({
        q: folderId ? `'${folderId}' in parents` : undefined,
        fields: "files(id, name, mimeType, webViewLink, iconLink, size, modifiedTime)",
      });
      res.json(response.data.files);
    } catch (error: any) {
      console.error("Drive API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Discord Webhook Integration Placeholder
  app.post("/api/notifications/discord", async (req, res) => {
    const { message } = req.body;
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return res.status(500).json({ error: "Discord Webhook URL not configured" });
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
      if (response.ok) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to send notification" });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/drive/download/:fileId", async (req, res) => {
    const drive = getDriveClient();
    if (!drive) {
      return res.status(500).json({ error: "Google Drive not configured" });
    }

    const { fileId } = req.params;
    const { name } = req.query;

    try {
      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      res.setHeader("Content-Disposition", `attachment; filename="${name || 'download'}"`);
      response.data.pipe(res);
    } catch (error: any) {
      console.error("Download Error:", error);
      res.status(500).json({ error: error.message });
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
