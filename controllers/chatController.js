const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `
You are the AI Assistant for Appixo Technologies (appixotech.com).
Appixo is a premier digital engineering and software consultancy delivering high-performance digital products worldwide.

Core Services:
- Web Platforms & SaaS: React, Next.js, Node.js, Python, scalable enterprise architecture, custom web applications.
- Mobile App Development: Native (iOS/Swift, Android/Kotlin) and cross-platform (React Native, Flutter).
- Cloud Architecture & DevOps: AWS, GCP, Azure, Docker, Kubernetes, CI/CD pipelines, serverless infrastructure.
- AI & Intelligent Systems: Custom LLM integrations, conversational AI agents, predictive systems, automation.
- UI/UX & Product Design: User research, wireframing, Figma design systems, modern responsive interfaces.
- Startup MVP Acceleration & Digital Transformation for established enterprises.

Global Presence:
- Active clients across: United States (US), United Kingdom (UK), Canada, Australia, UAE, India, and Spain.

Communication Style & Instructions:
- Tone: Friendly, concise, technical, and professional.
- Always speak on behalf of Appixo ("we", "our team", "at Appixo").
- Keep replies focused, digestible, and well-structured with clear bullet points when appropriate.
- Pricing policy: Explain that every project is custom-tailored based on scope, tech stack, and timeline. Invite the client to submit their requirements for a free consultation and project estimate.
- Call to Action: Invite prospective clients to schedule a consultation or request a quote at the enquiry page (/enquiry) or reach out via contact@appixotech.com.
`;

/**
 * Normalizes input history from various frontend chat formats
 * into Gemini's expected [{ role: 'user' | 'model', parts: [{ text: string }] }]
 */
function normalizeHistory(rawHistory, currentMessage) {
  if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
    return [];
  }

  const normalized = [];

  for (const item of rawHistory) {
    if (!item) continue;

    let role = (item.role || item.sender || '').toLowerCase();
    if (role === 'assistant' || role === 'bot' || role === 'ai') {
      role = 'model';
    } else if (role === 'user' || role === 'client') {
      role = 'user';
    } else {
      // Default guess
      role = item.isBot ? 'model' : 'user';
    }

    let text = '';
    if (typeof item.content === 'string') {
      text = item.content;
    } else if (typeof item.text === 'string') {
      text = item.text;
    } else if (Array.isArray(item.parts) && item.parts[0]?.text) {
      text = item.parts.map(p => p.text).join('\n');
    }

    text = text.trim();
    if (!text) continue;

    // Avoid duplicate consecutive turns with the same role by appending or skipping
    if (normalized.length > 0 && normalized[normalized.length - 1].role === role) {
      normalized[normalized.length - 1].parts[0].text += `\n${text}`;
    } else {
      normalized.push({
        role,
        parts: [{ text }]
      });
    }
  }

  // Ensure history starts with a user turn if there are any items
  while (normalized.length > 0 && normalized[0].role !== 'user') {
    normalized.shift();
  }

  // If the last message in history is a user message matching the current message,
  // remove it from history since it will be passed to sendMessage(currentMessage)
  if (normalized.length > 0 && normalized[normalized.length - 1].role === 'user') {
    const lastText = normalized[normalized.length - 1].parts[0].text.trim();
    if (lastText.toLowerCase() === currentMessage.trim().toLowerCase()) {
      normalized.pop();
    }
  }

  // Gemini requires alternating user/model turns.
  // When calling startChat({ history }).sendMessage(message), the history should ideally end on 'model',
  // so that sendMessage provides the subsequent 'user' turn.
  if (normalized.length > 0 && normalized[normalized.length - 1].role === 'user') {
    normalized.pop();
  }

  return normalized;
}

/**
 * Handles incoming chat messages and generates responses with Gemini
 */
exports.sendMessage = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required and must be a non-empty string.',
        success: false
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the backend server.',
        hint: 'Please set GEMINI_API_KEY in appixo_backend/.env file or server environment.',
        success: false
      });
    }

    const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const fallbackModels = [
      primaryModel,
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest'
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    const genAI = new GoogleGenerativeAI(apiKey);
    const cleanHistory = normalizeHistory(history, message);

    let lastError = null;
    let replyText = null;
    let usedModel = null;

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            topP: 0.95
          }
        });

        const chat = model.startChat({
          history: cleanHistory
        });

        const result = await chat.sendMessage(message.trim());
        const response = await result.response;
        replyText = response.text();
        usedModel = modelName;
        break; // Successfully generated response
      } catch (err) {
        lastError = err;
        console.warn(`[Chat] Model ${modelName} failed, attempting next: ${err.message}`);
      }
    }

    if (!replyText) {
      console.error('[Chat] All Gemini models failed:', lastError);
      return res.status(502).json({
        error: 'Failed to generate response from Gemini API.',
        details: lastError?.message || 'Unknown upstream AI error',
        success: false
      });
    }

    // Return friendly payload compatible with various frontend implementations
    return res.status(200).json({
      success: true,
      reply: replyText,
      response: replyText,
      message: replyText,
      model: usedModel
    });
  } catch (error) {
    console.error('[Chat] Unexpected error in sendMessage:', error);
    return res.status(500).json({
      error: 'An internal server error occurred while processing the chat request.',
      details: error.message,
      success: false
    });
  }
};

/**
 * Health check & configuration status for the chatbot route
 */
exports.getChatStatus = (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.status(200).json({
    status: 'online',
    endpoint: '/api/chat',
    method: 'POST',
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    configured: hasKey,
    documentation: {
      request: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: 'What services does Appixo offer?',
          history: [
            { role: 'user', content: 'Hi' },
            { role: 'assistant', content: 'Hello! How can I help you today?' }
          ]
        }
      },
      response: {
        success: true,
        reply: 'Appixo builds high-performance mobile apps, web platforms...',
        model: 'gemini-1.5-flash'
      }
    }
  });
};
