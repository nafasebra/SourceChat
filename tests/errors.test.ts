// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { publicError } from '@/lib/ai/errors';

describe('publicError', () => {
  it('explains rate limits and allows a manual retry', () => {
    const message = publicError({ statusCode: 429 });
    expect(message).toContain('rate limited');
    expect(message).toContain('retry');
  });

  it.each([401, 403])(
    'explains rejected credentials for HTTP %i',
    (statusCode) => {
      expect(publicError({ statusCode })).toContain('server API key');
    },
  );

  it('marks timed-out responses as potentially incomplete', () => {
    const error = new Error('Internal timeout detail');
    error.name = 'TimeoutError';
    expect(publicError(error)).toContain('timed out');
    expect(publicError(error)).toContain('incomplete');
    expect(publicError(error)).not.toContain(error.message);
  });

  it.each([undefined, null, 'Upstream failure', 500, {}])(
    'handles unexpected thrown values without throwing or exposing them',
    (error) => {
      expect(publicError(error)).toBe(
        'The response was interrupted or the AI service is unavailable. Please retry.',
      );
    },
  );

  it('does not expose upstream response bodies or internal error messages', () => {
    const error = Object.assign(new Error('private-provider-detail'), {
      statusCode: 502,
      responseBody: 'private-upstream-response',
    });
    const message = publicError(error);
    expect(message).toContain('Please retry');
    expect(message).not.toContain(error.message);
    expect(message).not.toContain(error.responseBody);
  });
});
