import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Production Security Headers
app.use((_req: Request, res: Response, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "2mb" }));

// Initialize GoogleGenAI client lazily or when key exists
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder ordered by availability and latency
const MODEL_FALLBACK_LADDER = [
  "gemini-3.1-flash-lite", // High-Availability & Low-Latency model
  "gemini-flash-latest",   // Dynamic Alias
  "gemini-3.6-flash",      // Primary flash
  "gemini-3.7-flash",      // Deep Reasoning Fallback
];

interface ChatTurn {
  role: "user" | "assistant" | "model";
  content: string;
}

interface GenerateOptions {
  systemInstruction?: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
}

async function generateContentWithFallback(options: GenerateOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getAiClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: 0.7,
        },
      });

      const responseText = response.text || "";
      if (responseText.trim().length > 0) {
        return { text: responseText, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || 500;
      const message = err?.message || String(err);
      console.log(`[Gemini Fallback] Model ${model} returned status ${status}. Attempting next model...`);

      // Recoverable HTTP/API codes: 503, 429, 404, 500, etc.
      // Continue to next model in ladder
      continue;
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || "Unknown error"}`);
}

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Journal Reflection & Conversation API
app.post("/api/gemini/reflect", async (req: Request, res: Response) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const entryTitle = typeof body.entryTitle === "string" ? body.entryTitle.slice(0, 200) : "Reflection";
    const category = typeof body.category === "string" ? body.category : "reflection";
    const mode = typeof body.mode === "string" ? body.mode : "chat"; // 'chat' | 'summarize' | 'brainstorm'
    const history: ChatTurn[] = Array.isArray(body.history) ? body.history : [];
    const userPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const suggestTitle = Boolean(body.suggestTitle) || (history.length === 0 && mode !== "summarize");

    if (!userPrompt && mode !== "summarize") {
      return res.status(400).json({ error: "A prompt or reflection text is required." });
    }

    let systemInstruction = `You are a thoughtful, empathetic, and insight-oriented AI Reflection Companion inside a personal private journal application.
Your role is to help the user unpack their thoughts, observe recurring themes, offer constructive perspectives, and ask 1-2 open-ended reflective questions to deepen self-awareness.
Avoid generic clichés, overly cheerful platitudes, or unsolicited diagnosis. Always remain warm, grounded, respectful, and observant.
Format your output with clean Markdown (bolding key insights, concise bullet lists when helpful). Keep responses focused and readable (2-4 concise paragraphs max).`;

    if (mode === "summarize") {
      systemInstruction = `You are a perceptive journal summarizer.
Analyze the user's journal entry and reflections.
Provide:
1. **Core Theme**: 1-2 sentences capturing the heart of the reflection.
2. **Emotional Tone & Insights**: 2-3 bullet points identifying feelings, tensions, or revelations.
3. **Actionable Takeaway or Inquiry**: 1 mindful prompt or gentle step for the user moving forward.
Be concise, clear, and grounded.`;
    } else if (mode === "brainstorm") {
      systemInstruction = `You are an insightful brainstorming and perspective-shifting companion in a private journal.
Instead of standard conversational back-and-forth, analyze the user's thought and generate **3 Distinct Angles / Perspectives**:
1. **Philosophical & Meaning**: Unpack the deeper emotional roots, core values, and what this says about what truly matters to them.
2. **Pragmatic & Actionable**: Provide realistic, concrete experiments or immediate practical next steps they can test.
3. **Contrarian & Alternative**: Offer a constructive counter-perspective that gently challenges their default assumptions or re-frames the situation completely.

Conclude with 1 sharp, curious inquiry question. Keep the tone grounded, engaging, and organized with clean markdown headers and bullet points.`;
    }

    if (suggestTitle) {
      systemInstruction += `\n\nCRITICAL TITLE REQUIREMENT:
Because this is the first message in this reflection, on the VERY FIRST line of your response output a concise 3 to 6 word title summarizing the user's core focus/topic in this exact bracketed format:
[TITLE: Your 3 to 6 Word Title Here]
Do not include any quotes or asterisks inside the brackets. After this title line, leave an empty blank line and continue with your normal reflective response.`;
    }

    // Build contents for @google/genai format
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Context prelude with entry details
    const contextNote = `[Context: Journal Entry "${entryTitle}" | Category: ${category}]`;

    for (let i = 0; i < history.length; i++) {
      const turn = history[i];
      const role = turn.role === "assistant" || turn.role === "model" ? "model" : "user";
      const text = turn.content || "";
      if (text.trim().length > 0) {
        contents.push({
          role,
          parts: [{ text: (i === 0 && role === "user" ? `${contextNote}\n\n${text}` : text) }],
        });
      }
    }

    if (userPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: (contents.length === 0 ? `${contextNote}\n\n${userPrompt}` : userPrompt) }],
      });
    } else if (mode === "summarize" && contents.length > 0) {
      contents.push({
        role: "user",
        parts: [{ text: "Please provide a concise summary, key emotional themes, and forward-looking takeaway for this entire entry." }],
      });
    }

    if (contents.length === 0) {
      return res.status(400).json({ error: "No reflection content available to process." });
    }

    const { text, modelUsed } = await generateContentWithFallback({
      systemInstruction,
      contents,
    });

    let cleanedText = text;
    let suggestedTitle: string | undefined;

    if (suggestTitle) {
      const titleMatch = cleanedText.match(/^\[TITLE:\s*(.+?)\]\s*\n*/i);
      if (titleMatch) {
        suggestedTitle = titleMatch[1].replace(/["'*_`#]/g, '').trim();
        cleanedText = cleanedText.replace(/^\[TITLE:\s*(.+?)\]\s*\n*/i, '').trim();
      }
    }

    return res.json({
      text: cleanedText,
      suggestedTitle: suggestedTitle || undefined,
      modelUsed,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/reflect:", error);
    return res.status(500).json({
      error: error?.message || "Failed to process reflection with Gemini.",
    });
  }
});

// Start server and Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  process.on("SIGTERM", () => {
    server.close(() => {
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

startServer().catch((err) => {
  console.error("Critical error starting server:", err);
  process.exit(1);
});
