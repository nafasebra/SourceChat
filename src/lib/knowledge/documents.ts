export type Source = {
  id: string;
  title: string;
  reference: string;
  content: string;
  tags: string[];
};

// Original learning notes, not copies of the linked reference documentation.
export const documents: Source[] = [
  {
    id: 'streaming',
    title: 'Streaming, one chunk at a time',
    reference: 'https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol',
    tags: ['stream', 'streaming', 'sse', 'sdk', 'response', 'cancel'],
    content:
      'Streaming delivers a response in small increments so a reader can start before generation finishes. SourceChat uses the Vercel AI SDK UI message stream over Server-Sent Events (SSE). Text events have a start, incremental deltas, and an end. A finish event signals completion. Cancellation aborts the HTTP request and propagates an abort signal to the provider. An interrupted answer should stay visible and be marked incomplete; the user can retry.',
  },
  {
    id: 'citations',
    title: 'Answers with a paper trail',
    reference: 'local:knowledge/citations',
    tags: [
      'citation',
      'citations',
      'source',
      'sources',
      'retrieval',
      'rag',
      'evidence',
      'trust',
    ],
    content:
      'SourceChat retrieves relevant local learning notes with deterministic keyword scoring before calling a model. Only retrieved excerpts are supplied as source context. The model writes citation tokens like [[citations]]. The server validates every citation ID against that request’s retrieved documents, including tokens split across stream chunks. Unknown IDs are replaced with an unverified reference label. Source metadata comes from local documents, never from model-generated URLs. A valid ID establishes a reference to a document, not proof that a claim is correct. OpenRouter does not automatically provide web search or verified citations.',
  },
  {
    id: 'accessibility',
    title: 'A chat that works for everyone',
    reference: 'https://www.w3.org/WAI/WCAG22/quickref/',
    tags: [
      'accessibility',
      'accessible',
      'keyboard',
      'focus',
      'scroll',
      'motion',
      'ui',
    ],
    content:
      'An accessible chat needs labeled controls, visible keyboard focus, readable contrast, and meaningful loading and error states. Avoid announcing every streamed token to screen readers; announce status changes instead. Keep focus in the composer after sending. Auto-scroll only while a reader is near the bottom and respect manual scrolling. Offer a jump-to-latest control. Honor prefers-reduced-motion. Citation controls should reveal the source and focus its heading.',
  },
  {
    id: 'architecture',
    title: 'Inside the SourceChat architecture',
    reference: 'local:knowledge/architecture',
    tags: [
      'architecture',
      'next',
      'react',
      'server',
      'client',
      'typescript',
      'project',
      'sourcechat',
      'build',
    ],
    content:
      'SourceChat uses Next.js App Router and strict TypeScript. The page is a Server Component and chat is a Client Component using useChat. The POST /api/chat route validates text-only conversation input with Zod, retrieves local notes, and streams a response with the Vercel AI SDK. The OpenRouter key stays in server environment variables. Real mode is the default and offers available free OpenRouter text models. Explicitly enabling MOCK_AI streams deterministic test fixtures through the same UI message protocol without external calls. No database, authentication, or paid model is required.',
  },
  {
    id: 'testing',
    title: 'Testing without API credits',
    reference: 'local:knowledge/testing',
    tags: [
      'test',
      'tests',
      'testing',
      'mock',
      'vitest',
      'playwright',
      'errors',
      'rate',
      'limits',
    ],
    content:
      'Vitest tests retrieval, chunk-safe citation filtering, request validation and chat UI states. Playwright runs the complete app in forced mock mode to test submitting prompts, progressive streaming, cancellation, retries and source navigation. Mock fixtures never call an external AI API. Free models have availability and rate limits. Present a useful error for rate limits and allow a manual retry. Do not silently switch to a paid model. Real-provider behavior requires a separate manual smoke test with an API key.',
  },
];
