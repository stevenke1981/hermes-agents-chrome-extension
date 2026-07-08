import type { AgentMode } from '../shared/types';

export type TranscriptMessage = {
  role: 'system' | 'user' | 'hermes';
  text: string;
};

export interface RuntimeSelection {
  selectedModelId: string;
  selectedProfileId: string;
  selectedSessionId: string;
}

export interface ResolvedRuntimeSelection {
  model?: string;
  profile?: string;
  sessionId?: string;
}

const agentModePrompts: Record<AgentMode, string> = {
  general_chat: 'Use normal Hermes chat behavior. Answer the user directly and clearly.',
  summarize_page: 'Summarize the provided browser context. Include key points and note limits.',
  explain_page: 'Explain the provided browser context in plain language.',
  rewrite_selection: 'Rewrite the selected text while preserving the user intent.',
  action_items: 'Turn the browser context into prioritized tasks and next steps.',
  dev_handoff:
    'Create an implementation-ready Codex/OpenCode handoff with problem, context, acceptance criteria, test plan, risks, and steps.',
  qa_check: 'Create QA test cases, edge cases, and acceptance checks from the browser context.',
  security_review: 'Review the browser context or request for security and privacy risks.'
};

export function appendPendingTurn(
  transcript: TranscriptMessage[],
  userMessage: string
): TranscriptMessage[] {
  return [...transcript, { role: 'user', text: userMessage }, { role: 'hermes', text: '' }];
}

export function applyDeltaToTranscript(
  transcript: TranscriptMessage[],
  delta: string
): TranscriptMessage[] {
  return transcript.map((message, index) =>
    index === transcript.length - 1 && message.role === 'hermes'
      ? { ...message, text: `${message.text}${delta}` }
      : message
  );
}

export function buildAgentModeSystemPrompt(
  agentMode: AgentMode,
  browserContext?: string
): string {
  return [agentModePrompts[agentMode], browserContext].filter(Boolean).join('\n\n');
}

export function resolveSelectedRuntime(
  selection: RuntimeSelection
): ResolvedRuntimeSelection {
  return {
    ...(selection.selectedModelId ? { model: selection.selectedModelId } : {}),
    ...(selection.selectedProfileId ? { profile: selection.selectedProfileId } : {}),
    ...(selection.selectedSessionId ? { sessionId: selection.selectedSessionId } : {})
  };
}

