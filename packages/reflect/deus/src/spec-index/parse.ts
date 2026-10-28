//
// Copyright 2026 DXOS.org
//

/** The flat `key: value` pairs of a document's YAML frontmatter. */
export const frontmatter = (text: string): Record<string, string> =>
  Object.fromEntries(
    (text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').split('\n').flatMap((line) => {
      const match = line.match(/^([\w-]+):\s*(.*?)\s*(?:#.*)?$/);
      return match ? [[match[1], match[2]]] : [];
    }),
  );

/** The `req` lines nested in a block body, with each one's line offset within the body. */
export const reqs = (body: string): { id: string; title: string; offset: number }[] =>
  body.split('\n').flatMap((text, offset) => {
    const req = text.match(/^\s+req\s+([A-Za-z][\w.-]*)\s*:\s*(.*)$/);
    return req ? [{ id: req[1], title: req[2], offset }] : [];
  });

/** The ids of the `req` lines nested in a block body. */
export const reqIds = (body: string): string[] => reqs(body).map(({ id }) => id);
