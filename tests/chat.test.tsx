import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chat } from '@/components/chat/chat';
import { Markdown } from '@/components/chat/markdown';
import { documents } from '@/lib/knowledge/documents';
import { Message } from '@/components/chat/message';
import userEvent from '@testing-library/user-event';
const state = vi.hoisted(() => ({
  messages: [] as unknown[],
  status: 'ready',
  error: undefined as Error | undefined,
  sendMessage: vi.fn(),
  stop: vi.fn(),
  regenerate: vi.fn(),
  setMessages: vi.fn(),
  clearError: vi.fn(),
}));
vi.mock('@ai-sdk/react', () => ({ useChat: () => state }));
beforeEach(() => {
  state.messages = [];
  state.status = 'ready';
  state.error = undefined;
  vi.clearAllMocks();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false }),
  });
});
describe('chat states', () => {
  it('selects an available model and includes its ID on submit and retry', () => {
    state.error = new Error('Please retry.');
    render(
      <Chat
        mock={false}
        models={[
          { id: 'first/model:free', name: 'First model' },
          { id: 'second/model:free', name: 'Second model' },
        ]}
        defaultModel="first/model:free"
      />,
    );
    expect(screen.queryByText('Demo model')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'AI model' }), {
      target: { value: 'second/model:free' },
    });
    fireEvent.change(screen.getByLabelText('Your message'), {
      target: { value: 'Explain streaming' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(state.sendMessage).toHaveBeenCalledWith(
      { text: 'Explain streaming' },
      { body: { model: 'second/model:free' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry response' }));
    expect(state.regenerate).toHaveBeenCalledWith({
      body: { model: 'second/model:free' },
    });
  });
  it('shows a catalog failure and prevents sending without available models', () => {
    render(<Chat mock={false} modelError="Could not load available models." />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load available models',
    );
    fireEvent.change(screen.getByLabelText('Your message'), {
      target: { value: 'Hello' },
    });
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'AI model' })).toBeDisabled();
  });
  it('shows empty state and submits a prompt with composer focus', () => {
    render(<Chat mock />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'grounded answers',
    );
    const prompt = screen.getByLabelText('Your message');
    fireEvent.change(prompt, { target: { value: 'Explain streaming' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(state.sendMessage).toHaveBeenCalledWith({
      text: 'Explain streaming',
    });
    expect(prompt).toHaveFocus();
  });
  it('offers stop while loading', () => {
    state.status = 'submitted';
    render(<Chat mock />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop generation' }));
    expect(state.stop).toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'New conversation' }),
    ).toBeDisabled();
  });
  it('shows error with retry', () => {
    state.error = new Error('Rate limited. Please retry.');
    render(<Chat mock />);
    expect(screen.getByRole('alert')).toHaveTextContent('Rate limited');
    fireEvent.click(screen.getByRole('button', { name: 'Retry response' }));
    expect(state.regenerate).toHaveBeenCalled();
  });
  it('renders partial assistant text during streaming', () => {
    state.status = 'streaming';
    state.messages = [
      {
        id: 'a',
        role: 'assistant',
        parts: [{ type: 'text', text: 'A partial answer' }],
      },
    ];
    render(<Chat mock />);
    expect(screen.getByText('A partial answer')).toBeVisible();
    expect(screen.getByText('Writing from your sources…')).toBeVisible();
  });
});
it('only creates citation controls from known server sources', () => {
  const select = vi.fn();
  render(
    <Markdown
      text={
        'A [[streaming]] and [[invented]]. [model link](https://evil.example)'
      }
      sources={[documents[0]]}
      onCitation={select}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /View source/ }));
  expect(select).toHaveBeenCalledWith('streaming');
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByText(/unverified reference/)).toBeVisible();
});
it('renders highlighted code and copies the full response', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  const text = '```typescript\nconst answer = 42;\n```';
  const { container } = render(
    <Message
      message={{
        id: 'code',
        role: 'assistant',
        parts: [{ type: 'text', text }],
      }}
      onCitation={vi.fn()}
    />,
  );
  expect(container.querySelector('code .hljs-keyword')).toHaveTextContent(
    'const',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Copy response' }));
  expect(writeText).toHaveBeenCalledWith(text);
  expect(screen.getByRole('status')).toHaveTextContent('Copied');
});
