import { test, expect } from '@playwright/test';
test('persists chats across refresh and reopens earlier conversations', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Your message' })
    .fill('How does SSE streaming work?');
  await page.getByRole('textbox', { name: 'Your message' }).press('Enter');
  await expect(
    page.getByRole('button', {
      name: 'View source: Streaming, one chunk at a time',
    }),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByRole('button', { name: 'Send message' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('article', { name: 'User message' }),
  ).toContainText('SSE streaming');
  await page.getByRole('button', { name: 'New conversation' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Your message' })
    .fill('Explain citations');
  await page.getByRole('textbox', { name: 'Your message' }).press('Enter');
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible({
    timeout: 20000,
  });
  if (testInfo.project.name === 'mobile') {
    await page
      .getByRole('combobox', { name: 'Conversation history' })
      .selectOption({ label: 'How does SSE streaming work?' });
  } else {
    await page
      .getByRole('navigation', { name: 'Conversation history' })
      .getByRole('button', { name: 'How does SSE streaming work?' })
      .click();
  }
  await expect(
    page.getByRole('article', { name: 'User message' }),
  ).toContainText('SSE streaming');
  await page
    .getByRole('button', {
      name: 'View source: Streaming, one chunk at a time',
    })
    .click();
  await expect(page.locator('#source-streaming')).toBeFocused();
  if (process.env.CAPTURE_SCREENSHOTS)
    await page.screenshot({
      path: `docs/screenshots/${testInfo.project.name}-history.png`,
      animations: 'disabled',
      caret: 'initial',
    });
  await page.getByRole('button', { name: 'Open knowledge base' }).click();
  await expect(
    page.getByRole('heading', { name: 'Knowledge base' }),
  ).toBeVisible();
});
test('streams an answer and navigates a citation with keyboard focus', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  if (process.env.CAPTURE_SCREENSHOTS)
    await page.screenshot({
      caret: 'initial',
      animations: 'disabled',
      path: `docs/screenshots/${testInfo.project.name}-welcome.png`,
    });
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'grounded answers',
  );
  await page.getByLabel('Your message').fill('How does SSE streaming work?');
  await page.getByLabel('Your message').press('Enter');
  await expect(
    page.getByRole('button', { name: 'Stop generation' }),
  ).toBeVisible();
  await expect(page.getByLabel('SourceChat response')).toContainText(
    'Streaming delivers',
  );
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible({
    timeout: 20000,
  });
  await page
    .getByRole('button', {
      name: 'View source: Streaming, one chunk at a time',
    })
    .click();
  await expect(
    page.getByRole('complementary', { name: 'Sources' }),
  ).toBeVisible();
  await expect(page.locator('#source-streaming')).toBeFocused();
  if (process.env.CAPTURE_SCREENSHOTS)
    await page.screenshot({
      caret: 'initial',
      animations: 'disabled',
      path: `docs/screenshots/${testInfo.project.name}-citations.png`,
    });
  await page.getByRole('button', { name: 'Close sources' }).click();
  await expect(page.getByLabel('Your message')).toBeFocused();
});
test('cancels generation and offers retry', async ({ page }) => {
  await page.goto('/');
  await page
    .getByLabel('Your message')
    .fill('Explain streaming citations architecture testing');
  await page.getByLabel('Your message').press('Enter');
  await expect(page.getByLabel('SourceChat response')).toContainText('Here');
  await page.getByRole('button', { name: 'Stop generation' }).click();
  await expect(
    page
      .getByText('Generation stopped. This answer is incomplete.', {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry response' }).click();
  await expect(
    page.getByRole('button', { name: 'Stop generation' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible({
    timeout: 20000,
  });
});
test('shows a meaningful HTTP error and retries without a paid call', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/chat', async (route) => {
    calls++;
    if (calls === 1)
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'The free model is rate limited. Wait a moment, then retry.',
        }),
      });
    else await route.continue();
  });
  await page.goto('/');
  await page.getByLabel('Your message').fill('Explain citations');
  await page.getByLabel('Your message').press('Enter');
  await expect(page.getByRole('alert', { name: 'Chat error' })).toContainText(
    'rate limited',
  );
  await page.getByRole('button', { name: 'Retry response' }).click();
  await expect(
    page
      .getByRole('button', { name: 'View source: Answers with a paper trail' })
      .first(),
  ).toBeVisible({ timeout: 20000 });
});
test('persists dark mode and fits the viewport', async ({ page }, testInfo) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: /Switch to dark mode|Toggle theme/ })
    .click();
  await expect(page.locator('html')).toHaveClass('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveClass('dark');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (process.env.CAPTURE_SCREENSHOTS)
    await page.screenshot({
      caret: 'initial',
      animations: 'disabled',
      path: `docs/screenshots/${testInfo.project.name}-dark.png`,
    });
});
test('marks a stream without a finish event as incomplete', async ({
  page,
}) => {
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      contentType: 'text/event-stream',
      headers: { 'x-vercel-ai-ui-message-stream': 'v1' },
      body: [
        { type: 'start', messageId: 'interrupted' },
        { type: 'text-start', id: 'answer' },
        {
          type: 'text-delta',
          id: 'answer',
          delta: 'This response ended early.',
        },
      ]
        .map((event) => `data: ${JSON.stringify(event)}\n\n`)
        .join(''),
    }),
  );
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Your message' })
    .fill('Explain streaming');
  await page.getByRole('textbox', { name: 'Your message' }).press('Enter');
  await expect(page.getByLabel('SourceChat response')).toContainText(
    'ended early',
  );
  await expect(
    page
      .getByText(
        'The response is incomplete. Retry to generate a new answer.',
        { exact: true },
      )
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Retry response' }),
  ).toBeVisible();
});
