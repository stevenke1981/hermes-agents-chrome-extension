import { describe, expect, it } from 'vitest';

import {
  appendPendingTurn,
  applyDeltaToTranscript,
  buildAgentModeSystemPrompt,
  resolveSelectedRuntime
} from '../src/sidepanel/conversation';

describe('side panel conversation state helpers', () => {
  it('appends a pending user turn without replacing transcript history', () => {
    const transcript = appendPendingTurn([{ role: 'hermes', text: 'Previous answer' }], 'Next question');

    expect(transcript).toEqual([
      { role: 'hermes', text: 'Previous answer' },
      { role: 'user', text: 'Next question' },
      { role: 'hermes', text: '' }
    ]);
  });

  it('appends streaming deltas to the pending Hermes message', () => {
    const transcript = applyDeltaToTranscript(
      [
        { role: 'user', text: 'Question' },
        { role: 'hermes', text: 'Hel' }
      ],
      'lo'
    );

    expect(transcript.at(-1)).toEqual({ role: 'hermes', text: 'Hello' });
  });

  it('builds agent-mode system prompts before optional browser context', () => {
    const context = buildAgentModeSystemPrompt('dev_handoff', 'UNTRUSTED_BROWSER_CONTEXT_START\n{}');

    expect(context).toContain('Codex/OpenCode');
    expect(context).toContain('UNTRUSTED_BROWSER_CONTEXT_START');
  });

  it('resolves selected runtime dropdown values into sendTurn input fields', () => {
    expect(
      resolveSelectedRuntime({
        selectedModelId: 'model-a',
        selectedProfileId: 'profile-web',
        selectedSessionId: 'session-1'
      })
    ).toEqual({
      model: 'model-a',
      profile: 'profile-web',
      sessionId: 'session-1'
    });

    expect(
      resolveSelectedRuntime({
        selectedModelId: '',
        selectedProfileId: '',
        selectedSessionId: ''
      })
    ).toEqual({});
  });
});

