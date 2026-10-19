import { documents, type Source } from './documents';
const stop = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'how',
  'what',
  'does',
  'do',
  'can',
  'i',
  'to',
  'and',
  'in',
  'of',
  'with',
  'for',
  'it',
  'me',
  'about',
]);
export function retrieve(query: string, limit = 3): Source[] {
  const terms = [
    ...new Set(
      (query.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
        (t) => !stop.has(t),
      ),
    ),
  ];
  return documents
    .map((doc, index) => ({
      doc,
      index,
      score: terms.reduce(
        (score, term) =>
          score +
          (doc.tags.some((tag) => tag === term) ? 5 : 0) +
          (doc.title.toLowerCase().includes(term) ? 2 : 0) +
          (doc.content.toLowerCase().includes(term) ? 1 : 0),
        0,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map((item) => item.doc);
}
