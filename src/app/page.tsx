import { Chat } from '@/components/chat/chat';
import { isMockMode } from '@/lib/ai/provider';
import { connection } from 'next/server';

export default async function Page() {
  // Read the mode at request time, keeping the UI in sync with server configuration.
  await connection();
  return <Chat mock={isMockMode()} />;
}
