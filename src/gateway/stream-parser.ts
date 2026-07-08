import type { HermesStreamEvent } from '../shared/types';

type JsonObject = Record<string, unknown>;

export function parseHermesStreamChunk(line: string): HermesStreamEvent | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':')) {
    return undefined;
  }

  const payload = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
  if (!payload) {
    return undefined;
  }

  if (payload === '[DONE]') {
    return { type: 'done' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { type: 'warning', message: 'Unparseable stream event skipped.' };
  }

  if (!isObject(parsed)) {
    return undefined;
  }

  const choiceText = extractChoiceDelta(parsed);
  if (choiceText) {
    return { type: 'delta', text: choiceText };
  }

  if (parsed.type === 'tool' && typeof parsed.name === 'string') {
    return {
      type: 'tool',
      name: parsed.name,
      status: typeof parsed.status === 'string' ? parsed.status : undefined
    };
  }

  if (typeof parsed.content === 'string') {
    return { type: 'delta', text: parsed.content };
  }

  if (typeof parsed.error === 'string') {
    return { type: 'error', message: parsed.error };
  }

  return undefined;
}

function extractChoiceDelta(parsed: JsonObject): string | undefined {
  const choices = parsed.choices;
  if (!Array.isArray(choices)) {
    return undefined;
  }

  const [first] = choices;
  if (!isObject(first) || !isObject(first.delta)) {
    return undefined;
  }

  return typeof first.delta.content === 'string' ? first.delta.content : undefined;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
