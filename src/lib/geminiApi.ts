import type { EntryCategory, JournalTurn } from '../types';

export interface GenerateReflectionParams {
  entryTitle: string;
  category: EntryCategory;
  history: JournalTurn[];
  prompt?: string;
  mode?: 'chat' | 'summarize' | 'brainstorm';
  suggestTitle?: boolean;
  signal?: AbortSignal;
}

export interface GenerateReflectionResponse {
  text: string;
  modelUsed: string;
  timestamp: number;
  suggestedTitle?: string;
}

export async function requestGeminiReflection(params: GenerateReflectionParams): Promise<GenerateReflectionResponse> {
  const response = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: params.signal,
    body: JSON.stringify({
      entryTitle: params.entryTitle,
      category: params.category,
      history: params.history.map((t) => ({
        role: t.role,
        content: t.content,
      })),
      prompt: params.prompt || '',
      mode: params.mode || 'chat',
      suggestTitle: Boolean(params.suggestTitle),
    }),
  });

  if (!response.ok) {
    let errorMessage = `Server responded with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData?.error) {
        errorMessage = errData.error;
      }
    } catch {
      // Use fallback status text
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return {
    text: data.text,
    modelUsed: data.modelUsed || 'gemini-3.1-flash-lite',
    timestamp: data.timestamp || Date.now(),
    suggestedTitle: data.suggestedTitle,
  };
}
