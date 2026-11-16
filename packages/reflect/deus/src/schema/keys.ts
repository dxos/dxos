//
// Copyright 2026 DXOS.org
//

import { decodeBlock, patchBlock } from './codec.ts';
import { keyedFields } from './dialects.ts';
import { type SourceBlock, type SourceField, parseSourceBlocks } from './source.ts';
import { type Change } from './text.ts';
import { type BlockSchema } from './types.ts';

/** Key characters: lowercase letters and digits, without the look-alikes `l`, `o`, `0` and `1`. */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const LETTERS = 'abcdefghijkmnpqrstuvwxyz';

/** A fresh key, not in `taken`: five characters, starting with a letter so it never reads as a number. */
export const mintKey = (taken: ReadonlySet<string>, random: () => number = Math.random): string => {
  for (;;) {
    const pick = (chars: string) => chars[Math.floor(random() * chars.length)];
    const key = pick(LETTERS) + Array.from({ length: 4 }, () => pick(ALPHABET)).join('');
    if (!taken.has(key)) {
      return key;
    }
  }
};

/** Whether an id is a positional number of a kind labelled `prefix` (`F-3`, `F-3.2`), as specs wrote ids before keys. */
export const isNumberedId = (id: string, prefix: string): boolean => new RegExp(`^${prefix}-\\d+(\\.\\d+)*$`).test(id);

/** One addressable item of a spec: a block, or a keyed line of one. */
export type SpecItem = {
  kind: string;
  /** The block's id, or the keyed line's key. */
  key: string;
  /** For a numbered kind, the positional label (`F-3`, `F-3.2`). */
  label?: string;
  block: SourceBlock;
  /** For a keyed line, its source. */
  entry?: SourceField;
};

/** Every block and keyed line of a spec, with positional labels for numbered kinds, in document order. */
export const specItems = (text: string, schemas: ReadonlyMap<string, BlockSchema>): SpecItem[] => {
  const blocks = parseSourceBlocks(text, { keyed: (kind) => keyedFields(schemas.get(kind)) });
  const counts = new Map<string, number>();
  return blocks.flatMap((block) => {
    const schema = schemas.get(block.kind);
    const prefix = schema?.label;
    const count = (counts.get(block.kind) ?? 0) + 1;
    counts.set(block.kind, count);
    const label = prefix ? `${prefix}-${count}` : undefined;
    const keyed = keyedFields(schema);
    const entries = block.fields.filter((field) => field.key !== undefined && keyed.has(field.name));
    return [
      { kind: block.kind, key: block.id, ...(label && { label }), block },
      ...entries.map((entry, index) => ({
        kind: entry.name,
        key: entry.key!,
        ...(label && { label: `${label}.${index + 1}` }),
        block,
        entry,
      })),
    ];
  });
};

/** Labels by key, for drawing a key as its label. */
export const labelsByKey = (items: readonly SpecItem[]): ReadonlyMap<string, string> =>
  new Map(items.flatMap(({ key, label }) => (key && label ? [[key, label]] : [])));

export type RekeyOptions = {
  random?: () => number;
  /** The spec's own id, so `<id>#F-3` citations of its items are rewritten too. */
  specId?: string;
};

/**
 * Gives every item of a numbered kind a key: one with no id, a positional id (`F-3`) or an id a
 * previous item already has gets a fresh one. References to a rewritten id in reference fields, and
 * citations `<specId>#<id>`, are rewritten with it. Returns the changes and the old-to-new map for
 * ids that had one, so links stored outside the text can follow.
 */
export const rekey = (
  text: string,
  schemas: ReadonlyMap<string, BlockSchema>,
  { random, specId }: RekeyOptions = {},
): { changes: Change[]; keys: ReadonlyMap<string, string> } => {
  const items = specItems(text, schemas);
  const taken = new Set(items.map(({ key }) => key).filter(Boolean));
  const seen = new Set<string>();
  const keys = new Map<string, string>();
  const changes: Change[] = [];
  for (const item of items) {
    const prefix = schemas.get(item.block.kind)?.label;
    if (!prefix) {
      continue;
    }
    const stale = !item.key || isNumberedId(item.key, prefix) || seen.has(item.key);
    seen.add(item.key);
    if (!stale) {
      continue;
    }
    const key = mintKey(taken, random);
    taken.add(key);
    if (item.key && !keys.has(item.key)) {
      keys.set(item.key, key);
    }
    const range = item.entry ? item.entry.keyRange : item.block.header.id;
    changes.push(
      range
        ? { from: range.from, to: range.to, insert: key }
        : { from: item.block.header.kind.to, to: item.block.header.kind.to, insert: ` ${key}` },
    );
  }
  if (keys.size === 0) {
    return { changes, keys };
  }

  // References in reference fields follow their target's new key.
  for (const block of new Set(items.map(({ block }) => block))) {
    const schema = schemas.get(block.kind);
    if (!schema) {
      continue;
    }
    const value = decodeBlock(text, block, schema);
    const fields = Object.fromEntries(
      schema.fields.map(({ name, type }) => {
        const current = value.fields[name];
        if (type.kind !== 'ref' || value.raw.includes(name)) {
          return [name, current];
        }
        const follow = (id: string) => keys.get(id) ?? id;
        return [name, typeof current === 'string' ? follow(current) : (current as string[] | undefined)?.map(follow)];
      }),
    );
    changes.push(...patchBlock(text, block, schema, { ...value, fields }));
  }

  if (specId) {
    const escaped = specId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const match of text.matchAll(new RegExp(`${escaped}#([\\w-]+(?:\\.[\\w-]+)*)`, 'g'))) {
      const key = keys.get(match[1]);
      const from = match.index + specId.length + 1;
      // A citation inside a reference field the field's own change already rewrote is left to it.
      if (key && !changes.some((change) => change.from <= from && from < change.to)) {
        changes.push({ from, to: from + match[1].length, insert: key });
      }
    }
  }
  return { changes, keys };
};
