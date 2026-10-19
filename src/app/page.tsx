import { Chat } from '@/components/chat/chat';
import { getDefaultModelId, isMockMode } from '@/lib/ai/provider';
import { getFreeModels } from '@/lib/ai/models';
import type { ModelOption } from '@/lib/ai/types';
import { connection } from 'next/server';

export default async function Page() {
  // Read the mode at request time, keeping the UI in sync with server configuration.
  await connection();
  const mock = isMockMode();
  let models: ModelOption[] = [];
  let modelError = '';
  if (!mock) {
    try {
      models = await getFreeModels();
      if (!models.length)
        modelError =
          'No free text models are currently listed. Reload to check again.';
    } catch {
      modelError =
        'Could not load available models from OpenRouter. Reload the page to retry.';
    }
  }
  return (
    <Chat
      mock={mock}
      models={models}
      defaultModel={getDefaultModelId()}
      modelError={modelError}
    />
  );
}
