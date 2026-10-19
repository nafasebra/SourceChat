// Buffer only a possible citation token, never the complete answer.
export function createCitationFilter(allowedIds: readonly string[]) {
  const allowed = new Set(allowedIds);
  let pending = '';
  return {
    push(chunk: string, flush = false): string {
      pending += chunk;
      let output = '';
      while (pending.length) {
        const start = pending.indexOf('[[');
        if (start === -1) {
          const keep = !flush && pending.endsWith('[') ? 1 : 0;
          output += pending.slice(0, pending.length - keep);
          pending = keep ? '[' : '';
          break;
        }
        output += pending.slice(0, start);
        pending = pending.slice(start);
        const end = pending.indexOf(']]');
        if (end === -1 && !flush && pending.length <= 100) break;
        if (end === -1) {
          output += '(unverified reference)';
          pending = '';
          break;
        }
        const id = pending.slice(2, end);
        output += allowed.has(id) ? `[[${id}]]` : '(unverified reference)';
        pending = pending.slice(end + 2);
      }
      return output;
    },
  };
}
