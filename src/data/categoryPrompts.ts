import type { EntryCategory } from '../types';

export interface CategoryShowcaseItem {
  id: EntryCategory;
  title: string;
  tagline: string;
  samplePrompt: string;
  sampleResponse: string;
  responseMode?: 'chat' | 'brainstorm';
  prompts: string[];
}

export const CATEGORY_SHOWCASE_DATA: Record<EntryCategory, CategoryShowcaseItem> = {
  reflection: {
    id: 'reflection',
    title: 'Reflection',
    tagline: 'Mindful inquiry, emotional clarity, and self-awareness',
    samplePrompt: 'I feel torn between keeping things predictable and taking a leap into an unfamiliar creative project.',
    sampleResponse: `It is completely natural to feel friction between the security of the familiar and the pull of growth. Often, hesitation isn't a sign that you aren't ready—it's just your mind protecting your energy.

What is one low-stakes, lightweight experiment you could run this week to test the waters without risking your sense of security?`,
    responseMode: 'chat',
    prompts: [
      'What emotion or thought has taken up the most space in your head today?',
      'Reflect on a recent decision: what guided it, and how does it sit with you now?',
      'Where are you holding tension or resistance right now, and what might it be asking for?',
      'What is something you learned about yourself this past week that surprised you?',
    ],
  },
  gratitude: {
    id: 'gratitude',
    title: 'Gratitude',
    tagline: 'Grounding joy, appreciation, and noticing micro-blessings',
    samplePrompt: 'Today was frantic, but a quiet 10-minute walk at sunset completely centered me.',
    sampleResponse: `Those brief, uninterrupted pauses often anchor us far more deeply than large milestones. Taking time to notice the colors and the silence gives your nervous system permission to downshift.

When you recall that walk, what specific sensory detail stands out most clearly—the air, the light, or the stillness?`,
    responseMode: 'chat',
    prompts: [
      'Name 3 small, seemingly ordinary moments from today that brought you a quiet smile.',
      'Who is someone who made your day slightly easier or warmer, even in a small way?',
      'What is a tool, resource, or physical comfort you often take for granted?',
      'What challenge are you secretly grateful for having walked through in the past?',
    ],
  },
  brainstorm: {
    id: 'brainstorm',
    title: 'Brainstorm (3 Angles)',
    tagline: 'Deconstruct challenges across Philosophical, Pragmatic, and Contrarian lenses',
    samplePrompt: 'I have been procrastinating on writing and revising my personal project roadmap.',
    sampleResponse: `### 1. Philosophical & Meaning
Are you feeling unspoken pressure that the roadmap must define your worth or solve everything at once? Procrastination is frequently perfectionism in disguise—protecting you from the vulnerability of producing an imperfect first draft.

### 2. Pragmatic & Actionable
Strip the scope down: set a timer for exactly 7 minutes. Write only three bullet points on an index card with zero editing allowed. You don't need a comprehensive masterplan today; you only need the next single domino.

### 3. Contrarian & Alternative
What if this hesitation is actually valuable data? Perhaps a linear roadmap isn't the right medium for where this project currently is. What if you designed a loose moodboard or interviewed one trusted friend instead of drafting timelines?

*Inquiry*: Which of these three resonates with your gut right now?`,
    responseMode: 'brainstorm',
    prompts: [
      'I am hesitant between two career choices—let’s explore 3 different angles.',
      'How could I restructure my morning routine to protect my creative focus?',
      'What are 3 unexpected ways to approach a difficult conversation I have been avoiding?',
      'Brainstorm alternatives to my current approach on a project that feels stuck.',
    ],
  },
  daily_log: {
    id: 'daily_log',
    title: 'Daily Log',
    tagline: 'Capture daily milestones, energy levels, and timeline events',
    samplePrompt: 'Shipped the new API integration, had coffee with David, and spent the evening reading.',
    sampleResponse: `You struck a meaningful cadence today across focused technical work, interpersonal connection, and restorative quiet time.

As you look back on the API launch, what was the most rewarding technical hurdle you solved?`,
    responseMode: 'chat',
    prompts: [
      'Summarize your day in 3 key highlights and 1 challenge you resolved.',
      'What activity gave you the most energy today, and what drained you?',
      'What was the most important conversation or insight you had today?',
      'What is one priority you want to carry forward with intention into tomorrow?',
    ],
  },
  deep_thought: {
    id: 'deep_thought',
    title: 'Deep Thought',
    tagline: 'Foundational philosophy, personal ethics, and life compass inquiries',
    samplePrompt: 'Does genuine confidence come from past proof of success, or from trusting yourself to endure failure?',
    sampleResponse: `A crucial distinction. Past accomplishments create situational confidence—competence in things you already know how to do. But foundational, unflappable confidence comes from knowing you can handle emotional discomfort and navigate the aftermath of being wrong.

When you think about the decisions ahead, which type of confidence are you leaning on right now?`,
    responseMode: 'chat',
    prompts: [
      'What belief have you changed your mind about in the last two years, and why?',
      'What does "living a good life" mean to you right now, stripped of external expectations?',
      'How do you differentiate between healthy patience and fear-driven hesitation?',
      'What legacy or character traits do you want your daily habits to build over the next decade?',
    ],
  },
};
