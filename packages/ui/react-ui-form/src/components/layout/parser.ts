//
// Copyright 2026 DXOS.org
//

/**
 * Minimal XML-style DSL for laying out schema fields in a grid.
 *
 * Grammar:
 *   <grid cols="N">  ...children...  </grid>
 *   <field name="x" span="N"/>
 *
 * - Attributes accept `"…"`, `'…'`, or unquoted integers.
 * - Whitespace between tags is ignored. Text content (between tags) is forbidden.
 * - Self-closing form (`<field … />`) is required for `field`; `grid` must use a closing tag.
 *
 * The parser is hand-rolled (no HTML parser) because the grammar is tiny.
 */

/** Node type for the parsed layout tree. */
export type LayoutNode =
  | { readonly kind: 'grid'; readonly cols: number; readonly children: readonly LayoutNode[] }
  | { readonly kind: 'field'; readonly name: string; readonly span?: number };

export class LayoutParseError extends Error {
  readonly _tag = 'LayoutParseError';
  constructor(
    message: string,
    readonly position?: number,
  ) {
    super(position !== undefined ? `${message} (at position ${position})` : message);
  }
}

const TAG_RE = /<\s*(\/?)\s*(\w+)([^>]*?)(\/?)\s*>/g;
const ATTR_RE = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\d+))/g;

type Token =
  | { type: 'open'; name: string; attrs: Record<string, string>; selfClosing: boolean; position: number }
  | { type: 'close'; name: string; position: number };

const parseAttrs = (raw: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_RE.exec(raw)) !== null) {
    const [, key, doubleQuoted, singleQuoted, bare] = match;
    attrs[key] = doubleQuoted ?? singleQuoted ?? bare;
  }
  return attrs;
};

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  let cursor = 0;
  while ((match = TAG_RE.exec(input)) !== null) {
    // Validate that any text between the previous tag and this one is whitespace-only.
    const between = input.slice(cursor, match.index);
    if (between.trim().length > 0) {
      throw new LayoutParseError(`unexpected text content: ${JSON.stringify(between.trim())}`, cursor);
    }
    const [, slash, name, attrsRaw, selfSlash] = match;
    if (slash) {
      tokens.push({ type: 'close', name, position: match.index });
    } else {
      tokens.push({
        type: 'open',
        name,
        attrs: parseAttrs(attrsRaw),
        selfClosing: selfSlash === '/',
        position: match.index,
      });
    }
    cursor = match.index + match[0].length;
  }
  // Any trailing text after the last tag must also be whitespace.
  const trailing = input.slice(cursor);
  if (trailing.trim().length > 0) {
    throw new LayoutParseError(`unexpected text content: ${JSON.stringify(trailing.trim())}`, cursor);
  }
  return tokens;
};

const requireAttr = (attrs: Record<string, string>, key: string, tag: string, position: number): string => {
  const value = attrs[key];
  if (value === undefined) {
    throw new LayoutParseError(`<${tag}> missing required attribute "${key}"`, position);
  }
  return value;
};

const parseInteger = (value: string, attr: string, tag: string, position: number): number => {
  if (!/^\d+$/.test(value)) {
    throw new LayoutParseError(
      `<${tag}> attribute "${attr}" expects an integer, got ${JSON.stringify(value)}`,
      position,
    );
  }
  return Number.parseInt(value, 10);
};

/** Parses a layout template string into a single root node. The root must be `<grid>`. */
export const parseLayout = (template: string): LayoutNode => {
  const tokens = tokenize(template);
  if (tokens.length === 0) {
    throw new LayoutParseError('empty template');
  }

  let index = 0;

  const parseNode = (): LayoutNode => {
    const token = tokens[index];
    if (!token || token.type !== 'open') {
      throw new LayoutParseError(`expected an opening tag, got ${JSON.stringify(token)}`, token?.position);
    }

    if (token.name === 'field') {
      if (!token.selfClosing) {
        throw new LayoutParseError('<field> must be self-closing (e.g. <field name="x"/>)', token.position);
      }
      const name = requireAttr(token.attrs, 'name', 'field', token.position);
      const spanRaw = token.attrs.span;
      const span = spanRaw !== undefined ? parseInteger(spanRaw, 'span', 'field', token.position) : undefined;
      index += 1;
      return { kind: 'field', name, span };
    }

    if (token.name === 'grid') {
      if (token.selfClosing) {
        throw new LayoutParseError('<grid> must wrap children (cannot self-close)', token.position);
      }
      const cols = parseInteger(
        requireAttr(token.attrs, 'cols', 'grid', token.position),
        'cols',
        'grid',
        token.position,
      );
      index += 1;
      const children: LayoutNode[] = [];
      while (index < tokens.length && !(tokens[index].type === 'close' && tokens[index].name === 'grid')) {
        children.push(parseNode());
      }
      const closing = tokens[index];
      if (!closing || closing.type !== 'close' || closing.name !== 'grid') {
        throw new LayoutParseError('<grid> not closed', token.position);
      }
      index += 1;
      return { kind: 'grid', cols, children };
    }

    throw new LayoutParseError(`unknown element <${token.name}>`, token.position);
  };

  const root = parseNode();
  if (index !== tokens.length) {
    const trailing = tokens[index];
    throw new LayoutParseError(
      `unexpected trailing tag <${trailing.type === 'open' ? '' : '/'}${trailing.name}>`,
      trailing.position,
    );
  }
  if (root.kind !== 'grid') {
    throw new LayoutParseError('root element must be <grid>');
  }
  return root;
};
