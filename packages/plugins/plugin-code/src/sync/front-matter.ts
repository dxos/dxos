//
// Copyright 2026 DXOS.org
//

import type * as Spec from '@dxos/compute/Spec';
import { Obj } from '@dxos/echo';

/** A `.mdl` file's front matter, and what separates it from the text after it. */
const PATTERN = /^---\n([\s\S]*?)\n---(\n\n?|$)/;
const ENTRY = /^([\w-]+):\s*(.*?)\s*$/;

/** The front matter keys that are the spec's: its name, and its meta's key and version. */
const FIELDS: readonly string[] = ['id', 'name', 'version'];

/** Whether the text starts with front matter. */
export const hasFrontMatter = (text: string): boolean => PATTERN.test(text);

/** The text after the file's front matter, or all of it when it has none. */
export const body = (file: string): string => file.replace(PATTERN, '');

const entries = (file: string): Map<string, string> =>
  new Map(
    (file.match(PATTERN)?.[1] ?? '').split('\n').flatMap((line) => {
      const match = line.match(ENTRY);
      return match ? [[match[1], match[2]] as const] : [];
    }),
  );

const fields = (spec: Spec.Spec): Record<string, string | undefined> => {
  const { key, version } = Obj.getMeta(spec);
  return { id: key, name: spec.name || undefined, version };
};

/** Takes the file's front matter into the spec, returning the text after it. */
export const read = (spec: Spec.Spec, file: string): string => {
  const found = entries(file);
  if (found.size > 0) {
    Obj.update(spec, (spec) => {
      const name = found.get('name');
      if (name) {
        spec.name = name;
      }
      const meta = Obj.getMeta(spec);
      meta.key = found.get('id') ?? meta.key;
      meta.version = found.get('version') ?? meta.version;
    });
  }
  return body(file);
};

/**
 * The spec's file: front matter from the spec, then `text`. Written against `base`, the file last synced, so only the
 * keys it has are rewritten and its other keys and layout are kept; a file synced without front matter stays without
 * it. A new file gets every key the spec has.
 */
export const write = (spec: Spec.Spec, text: string, base?: string): string => {
  if (base !== undefined && !hasFrontMatter(base)) {
    return text;
  }
  const values = fields(spec);
  const lines = (base?.match(PATTERN)?.[1] ?? '').split('\n').filter(Boolean);
  const seen = new Set<string>();
  const kept = lines.map((line) => {
    const key = line.match(ENTRY)?.[1];
    if (key && FIELDS.includes(key)) {
      seen.add(key);
      return values[key] === undefined ? line : `${key}: ${values[key]}`;
    }
    return line;
  });
  const added =
    base === undefined
      ? FIELDS.filter((key) => !seen.has(key) && values[key] !== undefined).map((key) => `${key}: ${values[key]}`)
      : [];
  const separator = base?.match(PATTERN)?.[2] || '\n\n';
  return `---\n${[...kept, ...added].join('\n')}\n---${text ? separator : '\n'}${text}`;
};

/**
 * How a spec's text maps to its file. A text that still holds its own front matter is the file as it is; otherwise the
 * front matter is the spec's fields and meta.
 */
export type FileForm = {
  /** The part of a file the spec's text holds. */
  body: (file: string) => string;
  /** Takes the file into the spec, returning the part its text holds. */
  read: (spec: Spec.Spec, file: string) => string;
  /** The file for the spec's text, against the file last synced. */
  write: (spec: Spec.Spec, text: string, base?: string) => string;
};

const AS_IS: FileForm = { body: (file) => file, read: (_spec, file) => file, write: (_spec, text) => text };
const FRONT_MATTER: FileForm = { body, read, write };

/** The file form for a spec whose text is `text`. */
export const fileForm = (text: string): FileForm => (hasFrontMatter(text) ? AS_IS : FRONT_MATTER);
