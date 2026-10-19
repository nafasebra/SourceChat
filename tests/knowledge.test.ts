import { describe, expect, it } from 'vitest';
import { retrieve } from '@/lib/knowledge/retrieve';
import { createCitationFilter } from '@/lib/knowledge/citations';
import { chatRequestSchema } from '@/lib/validation/chat';
describe('retrieval', () => {
  it('normalizes casing, punctuation, and repeated search terms', () => {
    expect(retrieve('STREAMING!!!')).toEqual(retrieve('streaming'));
    expect(retrieve('streaming streaming accessibility')).toEqual(
      retrieve('streaming accessibility'),
    );
  });
  it('handles blank queries and negative result limits', () => {
    expect(retrieve('')).toEqual([]);
    expect(retrieve('   ...!?')).toEqual([]);
    expect(retrieve('streaming', -1)).toEqual([]);
  });
  it('ranks exact topic matches first', () => {
    expect(retrieve('How does streaming with SSE work?')[0].id).toBe(
      'streaming',
    );
    expect(retrieve('keyboard accessibility')[0].id).toBe('accessibility');
  });
  it('returns no fabricated context for unrelated queries', () => {
    expect(retrieve('quasars')).toEqual([]);
    expect(retrieve('the and a')).toEqual([]);
  });
  it('limits and deterministically orders results', () => {
    expect(retrieve('sourcechat testing citations', 2)).toHaveLength(2);
    expect(retrieve('sourcechat')).toEqual(retrieve('sourcechat'));
    expect(retrieve('streaming', 0)).toEqual([]);
  });
});
describe('citation filtering', () => {
  it('handles citations streamed one character at a time', () => {
    const filter = createCitationFilter(['streaming', 'citations']);
    const text = 'See [[streaming]][[unknown]] and [[citations]].';
    const answer =
      Array.from(text)
        .map((character) => filter.push(character))
        .join('') + filter.push('', true);
    expect(answer).toBe(
      'See [[streaming]](unverified reference) and [[citations]].',
    );
  });
  it('rejects case-mismatched and empty IDs while preserving literal brackets', () => {
    const filter = createCitationFilter(['streaming']);
    expect(filter.push('[[Streaming]] [[]] literal [', true)).toBe(
      '(unverified reference) (unverified reference) literal [',
    );
    expect(filter.push('', true)).toBe('');
  });
  it('accepts only retrieved IDs even across every possible chunk boundary', () => {
    const text = 'A [[streaming]] B [[forged]] C';
    for (let split = 0; split <= text.length; split++) {
      const filter = createCitationFilter(['streaming']);
      expect(
        filter.push(text.slice(0, split)) +
          filter.push(text.slice(split)) +
          filter.push('', true),
      ).toBe('A [[streaming]] B (unverified reference) C');
    }
  });
  it('flushes incomplete tokens and bounds token buffering', () => {
    const f = createCitationFilter([]);
    expect(f.push('Hello [[')).toBe('Hello ');
    expect(f.push('', true)).toBe('(unverified reference)');
    expect(createCitationFilter([]).push('[[' + 'x'.repeat(120))).toBe(
      '(unverified reference)',
    );
  });
  it('preserves ordinary markdown and isolated brackets', () => {
    const f = createCitationFilter([]);
    expect(f.push('[link](https://example.com) [') + f.push('ok]')).toBe(
      '[link](https://example.com) [ok]',
    );
  });
});
describe('request validation', () => {
  const user = {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text: 'Explain SSE' }],
  };
  it('accepts a text-only question', () =>
    expect(chatRequestSchema.safeParse({ messages: [user] }).success).toBe(
      true,
    ));
  it('rejects system messages, empty questions, oversized parts and tool input', () => {
    for (const message of [
      { ...user, role: 'system' },
      { ...user, parts: [{ type: 'text', text: '  ' }] },
      { ...user, parts: [{ type: 'text', text: 'x'.repeat(12001) }] },
      { ...user, parts: [{ type: 'tool-call', text: 'bad' }] },
    ])
      expect(chatRequestSchema.safeParse({ messages: [message] }).success).toBe(
        false,
      );
  });
});
