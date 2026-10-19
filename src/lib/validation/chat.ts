import { z } from 'zod';
const message = z.object({
  id: z.string().min(1).max(200),
  role: z.enum(['user', 'assistant']),
  parts: z
    .array(z.object({ type: z.literal('text'), text: z.string().max(12000) }))
    .min(1)
    .max(10),
});
export const chatRequestSchema = z
  .object({
    messages: z.array(message).min(1).max(40),
    model: z.string().min(1).max(200).optional(),
  })
  .refine(
    ({ messages }) =>
      messages.at(-1)?.role === 'user' &&
      messages.at(-1)!.parts.some((part) => part.text.trim()),
    'End the conversation with a nonempty user message.',
  );
