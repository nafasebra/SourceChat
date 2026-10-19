export function publicError(error: unknown): string {
  const status =
    typeof error === 'object' && error !== null && 'statusCode' in error
      ? error.statusCode
      : undefined;
  if (status === 429)
    return 'The free model is rate limited. Wait a moment, then retry.';
  if (status === 401 || status === 403)
    return 'OpenRouter rejected the server API key. Check the server configuration.';
  if (error instanceof Error && error.name === 'TimeoutError')
    return 'Generation timed out. The answer may be incomplete. Please retry.';
  return 'The response was interrupted or the AI service is unavailable. Please retry.';
}
