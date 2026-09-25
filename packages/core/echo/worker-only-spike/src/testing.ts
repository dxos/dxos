//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';

import * as Draft from '@dxos/automerge-proxy/Draft';

/** JSON with object keys sorted, so documents compare equal whatever order their keys were written in. */
export const canon = (value: unknown): string =>
  JSON.stringify(value, (_key, inner) =>
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(
          Object.keys(inner)
            .sort()
            .map((key) => [key, inner[key]]),
        )
      : inner,
  );

/** A seeded random source, so a failing run replays. */
export const seeded = (start: number) => {
  let seed = start;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed / 2 ** 31;
  };
  return { rand, pick: (n: number) => Math.floor(rand() * n) };
};

/** Moves a UTF-16 position off the middle of a surrogate pair: Automerge edits whole characters. */
export const boundary = (text: string, position: number): number => {
  const code = text.charCodeAt(position);
  return position > 0 && code >= 0xdc00 && code <= 0xdfff ? position - 1 : position;
};

/** The shape the random edits write. */
export type Shape = {
  content: string;
  title: A.ImmutableString;
  count?: number;
  tags: A.ImmutableString[];
  items: { name: A.ImmutableString; n: number }[];
  meta?: { keys: A.ImmutableString[]; at: Date };
  blob?: Uint8Array;
};

export const initialShape = (): Shape => ({
  content: 'hello world',
  title: new A.ImmutableString('t'),
  tags: [],
  items: [],
});

const words = ['ab', 'cd', 'é', '😀x', 'q', ' '];

/** A random ECHO-shaped edit through the draft a `change()` callback receives. */
export const randomEdit =
  ({ rand, pick }: ReturnType<typeof seeded>) =>
  (draft: Shape): void => {
    const roll = rand();
    if (roll < 0.45) {
      const text = draft.content;
      if (text.length > 2 && rand() < 0.35) {
        const at = boundary(text, pick(text.length - 1));
        Draft.splice(draft, ['content'], at, (text.codePointAt(at) ?? 0) > 0xffff ? 2 : 1, '');
      } else {
        Draft.splice(draft, ['content'], boundary(text, pick(text.length + 1)), 0, words[pick(words.length)]);
      }
    } else if (roll < 0.55) {
      draft.title = new A.ImmutableString(words[pick(words.length)]);
    } else if (roll < 0.62) {
      if ('count' in draft) {
        delete draft.count;
      } else {
        draft.count = pick(100);
      }
    } else if (roll < 0.72) {
      draft.tags.splice(pick(draft.tags.length + 1), 0, new A.ImmutableString(words[pick(words.length)]));
    } else if (roll < 0.78) {
      if (draft.tags.length > 0) {
        draft.tags.splice(pick(draft.tags.length), 1);
      }
    } else if (roll < 0.86) {
      draft.items.push({ name: new A.ImmutableString('item'), n: pick(10) });
    } else if (roll < 0.9) {
      if (draft.items.length > 0) {
        draft.items[pick(draft.items.length)].n = pick(10);
      }
    } else if (roll < 0.94) {
      draft.blob = new Uint8Array([pick(256), pick(256), pick(256)]);
    } else {
      draft.meta = { keys: [new A.ImmutableString(words[pick(words.length)])], at: new Date(pick(1e6) * 1000) };
    }
  };

/** The changes `peer` holds that `doc` lacks, as sync would send them. */
export const unknownTo = (doc: A.Doc<unknown>, peer: A.Doc<unknown>): Uint8Array[] =>
  A.getChanges(A.init(), peer).filter((change) => !A.hasHeads(doc, [A.decodeChange(change).hash]));
