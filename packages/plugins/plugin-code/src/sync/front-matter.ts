//
// Copyright 2026 DXOS.org
//

import type * as Spec from '@dxos/compute/Spec';
import { DIALECTS, fileDialects } from '@dxos/deus/dialect';
import {
  FRONTMATTER as PATTERN,
  editFrontmatter,
  frontmatter,
  frontmatterData,
  frontmatterList,
  withoutFrontmatter,
} from '@dxos/deus/spec-index';
import { Obj } from '@dxos/echo';
import * as LegacyProject from '@dxos/plugin-projects/LegacyProject';
import type { Text } from '@dxos/schema';

/** The front matter keys that are the spec's: its name, and its meta's key and version. */
const FIELDS: readonly string[] = ['id', 'name', 'version'];

/** Whether a file starts with front matter: its first block between `---` lines, whatever that block holds. */
const hasFrontMatter = (file: string): boolean => PATTERN.test(file);

/** The text after the file's front matter, or all of it when it has none; a spec's text is always this part. */
export const body = withoutFrontmatter;

const entries = (file: string): Map<string, string> => new Map(Object.entries(frontmatter(file)));

const bare = (id: string) => id.replace(/@.*$/, '');

const isDialect = (id: string) => DIALECTS.has(bare(id));

const same = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((id, index) => id === right[index]);

const sameSet = (left: readonly string[], right: readonly string[]) => {
  const ids = new Set(right);
  return new Set(left).size === ids.size && left.every((id) => ids.has(id));
};

const fields = (spec: Spec.Spec): Record<string, string | undefined> => {
  const { key, version } = Obj.getMeta(spec);
  return { id: key, name: spec.name || undefined, version };
};

/** Whether a file's front matter is a readable YAML map, or it has none; one that is not is neither read nor written. */
export const readable = (file: string): boolean => frontmatterData(file) !== undefined;

/**
 * Takes the file's front matter into the spec, its `extends` into its dialects, returning the text after it. Against
 * `base`, the file last synced, a field is taken only where the file changed it since or the spec has it unset, so a
 * change made in Composer and not yet written stays; a base whose front matter does not parse counts as none. Front
 * matter that does not parse gives nothing.
 */
export const read = (spec: Spec.Spec, file: string, base?: string): string => {
  if (!readable(file)) {
    return body(file);
  }
  const last = base !== undefined && readable(base) ? base : undefined;
  const found = entries(file);
  const lastEntries = last === undefined ? undefined : entries(last);
  const own = fields(spec);
  const take = (key: string) => {
    const value = found.get(key);
    return value !== undefined && value !== own[key] && (own[key] === undefined || value !== lastEntries?.get(key));
  };
  const named = fileDialects(file);
  const dialects =
    (spec.dialects.length === 0 || last === undefined || !same(named, fileDialects(last))) &&
    !same(named, spec.dialects);
  if (take('name') || take('id') || take('version') || dialects) {
    Obj.update(spec, (spec) => {
      const meta = Obj.getMeta(spec);
      spec.name = take('name') ? found.get('name')! : spec.name;
      meta.key = take('id') ? found.get('id') : meta.key;
      meta.version = take('version') ? found.get('version') : meta.version;
      if (dialects) {
        spec.dialects.splice(0, spec.dialects.length, ...named);
      }
    });
  }
  return body(file);
};

/**
 * Whether `text` starts with a copy of a file's front matter block as one of `files` (the versions of its file) holds
 * it: the spec's text a migration could not load to move the block into the fields.
 */
export const holdsCopy = (text: string, ...files: (string | undefined)[]): boolean => {
  const block = text.match(PATTERN)?.[1];
  return block !== undefined && files.some((file) => file?.match(PATTERN)?.[1] === block);
};

/** Finishes that migration: the block moves into the fields by the migration's rules. Every file round trip runs it. */
export const finishMigration = (spec: Spec.Spec, text: Text.Text, ...files: (string | undefined)[]): void => {
  if (holdsCopy(text.content, ...files)) {
    LegacyProject.moveFrontMatter(spec, text);
  }
};

/** Takes the fields the spec has unset from its file, as a sync pass does before comparing them. */
export const fill = (spec: Spec.Spec, file: string): void => void read(spec, file, file);

/**
 * The spec's file: front matter from the spec, then `text`. Written against `base`, the file last synced, so only the
 * keys it has are rewritten, each only when its value changed, and its comments and layout are kept; a block it cannot
 * read is kept as it is. A file synced without front matter stays without it unless `text` starts with a block a reader
 * would take for front matter, and a new file gets every key the spec has. `extends` gets the spec's dialects after the
 * specs it names, and is left as it is while they are unset.
 */
export const write = (spec: Spec.Spec, text: string, base?: string): string => {
  const held = base?.match(PATTERN);
  if (base !== undefined && !held && !hasFrontMatter(text)) {
    return text;
  }
  const values = fields(spec);
  const written = held ? (frontmatterData(base!) ?? {}) : undefined;
  const edits: Record<string, string | readonly string[]> = {};
  for (const key of FIELDS) {
    const value = values[key];
    if (value !== undefined && (written === undefined || (key in written && value !== written[key]))) {
      edits[key] = value;
    }
  }
  const dialects = spec.dialects.length > 0 ? spec.dialects : undefined;
  const listed = held ? frontmatterList(base!, 'extends') : [];
  const target = [...listed.filter((id) => !isDialect(id) && !dialects?.includes(bare(id))), ...(dialects ?? [])];
  if (dialects && !same(fileDialects(held ? base! : ''), dialects) && !sameSet(listed.map(bare), target.map(bare))) {
    edits.extends = target;
  }
  const [, block = '', separator = ''] = held ?? [];
  return `---\n${editFrontmatter(block, edits)}\n---${text ? separator || '\n\n' : '\n'}${text}`;
};
