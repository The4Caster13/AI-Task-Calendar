import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../lib/supabase';

const app = express();
app.use(helmet());
app.use(express.json({ limit: '32kb' }));

const anthropic = new Anthropic();
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const chatLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

const SYSTEM_PROMPT = `You are the AI Director inside TrueProgress, a productivity dashboard that tracks the user's projects, tasks, and weekly output. Give specific, actionable guidance grounded in what the user tells you about their work. Keep responses to a few sentences unless the user asks for more detail.

You can manage the user's projects and tasks directly using tools:
- add_task / remove_task: create or delete a task within an existing project.
- add_project / remove_project: create a brand new project, or delete an entire project along with all of its tasks.
Use add_project when the user asks to start, create, or track a new project or goal. Use remove_project when they ask to delete, remove, cancel, or archive an entire project — warn in your reply that this deletes all of its tasks too. Only call a tool when the user's message clearly asks for one of these actions — for general questions or advice, just reply with text.`;

type Provider = 'claude' | 'gemini';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ProjectContext {
  title: string;
  tasks: { title: string; completed: boolean }[];
}

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

const TOOL_DEFINITIONS = [
  {
    name: 'add_task',
    description: 'Add a new task to one of the user\'s existing projects.',
    schema: {
      type: 'object',
      properties: {
        projectTitle: { type: 'string', description: 'Title (or closest match) of the project to add the task to.' },
        title: { type: 'string', description: 'The title of the new task.' },
        isPriority: { type: 'boolean', description: 'Whether the task should be marked high priority.' },
      },
      required: ['projectTitle', 'title'],
    },
  },
  {
    name: 'remove_task',
    description: 'Remove an existing task by title.',
    schema: {
      type: 'object',
      properties: {
        taskTitle: { type: 'string', description: 'Title (or closest match) of the task to remove.' },
        projectTitle: { type: 'string', description: 'Optional project title, to disambiguate if multiple tasks share a similar name.' },
      },
      required: ['taskTitle'],
    },
  },
  {
    name: 'add_project',
    description: 'Create a brand new project for the user to track.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The title of the new project.' },
        description: { type: 'string', description: 'A short description of the project.' },
        deadline: { type: 'string', description: 'Optional deadline in YYYY-MM-DD format.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'remove_project',
    description: 'Delete an existing project by title, including all of its tasks.',
    schema: {
      type: 'object',
      properties: {
        projectTitle: { type: 'string', description: 'Title (or closest match) of the project to remove.' },
      },
      required: ['projectTitle'],
    },
  },
] as const;

function buildContextBlock(projects: ProjectContext[] | undefined): string {
  if (!Array.isArray(projects) || projects.length === 0) {
    return 'The user currently has no projects or tasks.';
  }
  const lines = projects.map((p) => {
    const taskLines = (p.tasks ?? [])
      .map((t) => `  - [${t.completed ? 'x' : ' '}] ${t.title}`)
      .join('\n') || '  (no tasks yet)';
    return `${p.title}:\n${taskLines}`;
  });
  return `Current projects and tasks:\n\n${lines.join('\n\n')}`;
}

async function askClaude(messages: ChatMessage[], contextBlock: string): Promise<{ reply: string; toolCalls: ToolCall[] }> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: `${SYSTEM_PROMPT}\n\n${contextBlock}`,
    tools: TOOL_DEFINITIONS.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema as any })),
    messages: messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  });

  const reply = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  const toolCalls = response.content
    .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
    .map((block) => ({ name: block.name, input: block.input as Record<string, unknown> }));

  return { reply, toolCalls };
}

async function askGemini(messages: ChatMessage[], contextBlock: string): Promise<{ reply: string; toolCalls: ToolCall[] }> {
  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction: `${SYSTEM_PROMPT}\n\n${contextBlock}`,
      tools: [{
        functionDeclarations: TOOL_DEFINITIONS.map((t) => ({
          name: t.name,
          description: t.description,
          parametersJsonSchema: t.schema,
        })),
      }],
    },
  });

  const toolCalls = (response.functionCalls ?? []).map((fc) => ({
    name: fc.name ?? '',
    input: (fc.args ?? {}) as Record<string, unknown>,
  }));

  return { reply: response.text ?? '', toolCalls };
}

app.post('/api/chat', chatLimiter, requireAuth, async (req, res) => {
  const { messages, provider, context } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  const selectedProvider: Provider = provider === 'gemini' ? 'gemini' : 'claude';
  const contextBlock = buildContextBlock(context?.projects);

  try {
    const { reply, toolCalls } = selectedProvider === 'gemini'
      ? await askGemini(messages as ChatMessage[], contextBlock)
      : await askClaude(messages as ChatMessage[], contextBlock);
    res.json({ reply, provider: selectedProvider, toolCalls });
  } catch (err) {
    console.error(`${selectedProvider} API error:`, err);
    res.status(500).json({ error: `Failed to reach ${selectedProvider === 'gemini' ? 'Gemini' : 'Claude'}` });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 8787;
app.listen(port, () => {
  console.log(`AI Director API listening on http://localhost:${port}`);
});
