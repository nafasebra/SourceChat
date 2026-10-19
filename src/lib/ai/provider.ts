import 'server-only';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
export function isMockMode() {
  return process.env.MOCK_AI !== 'false';
}
export function getModel() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key)
    throw new Error(
      'OpenRouter is not configured. Set a server API key or enable MOCK_AI.',
    );
  const id = process.env.OPENROUTER_MODEL || 'minimax/minimax-m3.1-flash:free';
  if (id !== 'openrouter/free' && !id.endsWith(':free'))
    throw new Error('Choose openrouter/free or a model ID ending in :free.');
  return createOpenRouter({ apiKey: key })(id);
}
