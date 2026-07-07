import { describe, expect, it } from 'vitest';

import {
  AGENT_MODES,
  CONTEXT_SCOPES,
  DEFAULT_GATEWAY_URL
} from '../src/shared/constants';
import { DEFAULT_GATEWAY_SETTINGS } from '../src/shared/storage';

describe('scaffold safety defaults', () => {
  it('defaults to the local Hermes gateway', () => {
    expect(DEFAULT_GATEWAY_URL).toBe('http://127.0.0.1:8642');
    expect(DEFAULT_GATEWAY_SETTINGS).toMatchObject({
      mode: 'local_api',
      gatewayUrl: DEFAULT_GATEWAY_URL,
      allowInsecureRemoteHttp: false
    });
  });

  it('keeps the expected v0.1 context scopes and agent modes', () => {
    expect(CONTEXT_SCOPES).toContain('chat_only');
    expect(CONTEXT_SCOPES).toContain('follow_active_tab');
    expect(AGENT_MODES).toContain('dev_handoff');
    expect(AGENT_MODES).toContain('security_review');
  });

  it('keeps voice capture disabled during the scaffold milestone', () => {
    expect(DEFAULT_GATEWAY_SETTINGS).not.toHaveProperty('voiceEnabled');
  });
});
