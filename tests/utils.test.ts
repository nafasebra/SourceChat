// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('handles empty input and optional classes', () => {
    expect(cn()).toBe('');
    expect(cn(undefined, null, false, '')).toBe('');
    expect(cn('flex', false && 'hidden', undefined, 'items-center')).toBe(
      'flex items-center',
    );
  });

  it('supports conditional objects and nested class arrays', () => {
    expect(
      cn(['flex', ['gap-2', null]], { 'font-bold': true, hidden: false }),
    ).toBe('flex gap-2 font-bold');
  });

  it('lets component overrides replace conflicting Tailwind defaults', () => {
    expect(cn('h-10 px-4 bg-foreground', 'h-14 px-6 bg-accent')).toBe(
      'h-14 px-6 bg-accent',
    );
  });

  it('preserves padding on other axes when overriding horizontal padding', () => {
    expect(cn('p-4', 'px-6')).toBe('p-4 px-6');
    expect(cn('px-6', 'p-4')).toBe('p-4');
  });

  it('merges each responsive or state variant independently', () => {
    expect(
      cn(
        'w-10 max-desktop:w-8 hover:bg-muted',
        'max-desktop:w-11 hover:bg-accent',
      ),
    ).toBe('w-10 max-desktop:w-11 hover:bg-accent');
  });

  it('keeps arbitrary font sizes separate from theme text colors', () => {
    expect(cn('text-[13px] text-subtle', 'text-accent')).toBe(
      'text-[13px] text-accent',
    );
    expect(cn('w-[225px]', 'w-[253px]')).toBe('w-[253px]');
  });
});
