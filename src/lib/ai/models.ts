import 'server-only';
import { z } from 'zod';
import type { ModelOption } from './types';

const catalogModel = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  architecture: z.object({
    input_modalities: z.array(z.string()),
    output_modalities: z.array(z.string()),
  }),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
    request: z.string().optional(),
  }),
});

export function parseFreeModels(input: unknown): ModelOption[] {
  const catalog = z.object({ data: z.array(z.unknown()) }).parse(input);
  const models = new Map<string, ModelOption>();
  for (const entry of catalog.data) {
    const parsed = catalogModel.safeParse(entry);
    if (!parsed.success) continue;
    const model = parsed.data;
    if (!(model.id.endsWith(':free') || model.id === 'openrouter/free'))
      continue;
    if (
      !model.architecture.input_modalities.includes('text') ||
      !model.architecture.output_modalities.includes('text')
    )
      continue;
    if (
      [
        model.pricing.prompt,
        model.pricing.completion,
        model.pricing.request ?? '0',
      ].some((price) => !price.trim() || Number(price) !== 0)
    )
      continue;
    models.set(model.id, { id: model.id, name: model.name });
  }
  return [...models.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getFreeModels(): Promise<ModelOption[]> {
  const key = process.env.OPENROUTER_API_KEY;
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new Error('Could not load the OpenRouter model catalog.');
  return parseFreeModels(await response.json());
}
