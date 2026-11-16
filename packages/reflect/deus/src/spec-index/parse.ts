//
// Copyright 2026 DXOS.org
//

import * as Yaml from 'yaml';

/** A document's YAML frontmatter: its block, and what separates it from the text after it. */
export const FRONTMATTER = /^---\n([\s\S]*?)\n---(\n\n?|$)/;

/** A frontmatter block parsed as a YAML map, every scalar a string; undefined when it is anything else. */
const parseBlock = (block: string): { doc: Yaml.Document; data: Record<string, unknown> } | undefined => {
  try {
    const doc = Yaml.parseDocument(block, { schema: 'failsafe' });
    if (doc.errors.length > 0 || doc.warnings.length > 0 || !(doc.contents === null || Yaml.isMap(doc.contents))) {
      return undefined;
    }
    return { doc, data: (doc.toJS() as Record<string, unknown> | null) ?? {} };
  } catch {
    return undefined;
  }
};

/** A document's frontmatter as YAML data: empty when it has none, undefined when its block is not a readable map. */
export const frontmatterData = (text: string): Record<string, unknown> | undefined => {
  const block = text.match(FRONTMATTER)?.[1];
  return block === undefined ? {} : parseBlock(block)?.data;
};

/** The string values of a document's frontmatter; a key with no value is absent. */
export const frontmatter = (text: string): Record<string, string> =>
  Object.fromEntries(
    Object.entries(frontmatterData(text) ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '',
    ),
  );

/** The strings a frontmatter key lists, as a YAML list or a single value. */
export const frontmatterList = (text: string, key: string): string[] => {
  const value = frontmatterData(text)?.[key];
  return (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string' && item !== '',
  );
};

/** An id without its `@version`. */
const bare = (item: unknown) => (typeof item === 'string' ? item.replace(/@.*$/, '') : undefined);

/** A list item's id without its `@version`. */
const itemId = (item: unknown) => bare(Yaml.isScalar(item) ? item.value : item);

/** Whether a YAML 1.2 or 1.1 reader would read `value`, written plain, as anything but that string, or fail on it. */
const retyped = (value: string) => {
  try {
    return [Yaml.parse(value, { logLevel: 'silent' }), Yaml.parse(value, { logLevel: 'silent', version: '1.1' })].some(
      (read) => read !== value,
    );
  } catch {
    return true;
  }
};

/** A scalar node for `value`, quoted where a reader would retype it. */
const scalar = (doc: Yaml.Document, value: string): Yaml.Scalar => {
  const node = doc.createNode(value) as Yaml.Scalar;
  node.type = retyped(value) ? Yaml.Scalar.QUOTE_DOUBLE : undefined;
  return node;
};

/**
 * `block`, a frontmatter's YAML, with each key in `edits` set by the `yaml` library, which writes the whole block; each
 * value set is quoted where a YAML 1.2 or 1.1 reader would read it as anything but its string, and every other value
 * reads as it did and keeps its style, though a multi-line one may be re-wrapped. A value keeps its comment, a single value made a list keeps it too, and a list keeps its style and
 * the first of the items that stay (an item matches an id with or without an `@version`), with new ones after them. A
 * block that is not a readable YAML map is returned as it is.
 */
export const editFrontmatter = (block: string, edits: Record<string, string | readonly string[]>): string => {
  const doc = parseBlock(block)?.doc;
  if (!doc || Object.keys(edits).length === 0) {
    return block;
  }
  for (const [key, value] of Object.entries(edits)) {
    const node = doc.get(key, true);
    if (typeof value === 'string') {
      if (Yaml.isScalar(node)) {
        node.value = value;
        node.type = retyped(value) ? Yaml.Scalar.QUOTE_DOUBLE : node.type;
      } else {
        doc.set(key, scalar(doc, value));
      }
    } else if (Yaml.isSeq(node)) {
      const ids = value.map(bare);
      const kept = node.items.filter(
        (item, index) =>
          ids.includes(itemId(item)) && node.items.findIndex((other) => itemId(other) === itemId(item)) === index,
      );
      node.items = [
        ...kept,
        ...value.filter((id) => !kept.some((item) => itemId(item) === bare(id))).map((id) => scalar(doc, id)),
      ];
    } else {
      const list = new Yaml.YAMLSeq(doc.schema);
      list.items = value.map((id) => scalar(doc, id));
      list.flow = true;
      list.comment = Yaml.isNode(node) ? node.comment : undefined;
      doc.set(key, list);
    }
  }
  return doc.toString({ flowCollectionPadding: false, lineWidth: 0 }).replace(/\n$/, '');
};

/** A document's text after its frontmatter and the blank line under it; all of it when it has none. */
export const withoutFrontmatter = (text: string): string => text.replace(FRONTMATTER, '');

/** The `req` lines nested in a block body, with each one's line offset within the body. */
export const reqs = (body: string): { id: string; title: string; offset: number }[] =>
  body.split('\n').flatMap((text, offset) => {
    const req = text.match(/^\s+req\s+([A-Za-z][\w.-]*)\s*:\s*(.*)$/);
    return req ? [{ id: req[1], title: req[2], offset }] : [];
  });

/** The ids of the `req` lines nested in a block body. */
export const reqIds = (body: string): string[] => reqs(body).map(({ id }) => id);
