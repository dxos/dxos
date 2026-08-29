//
// Copyright 2026 DXOS.org
//

//
// SPIKE. XML surface syntax over the model. Hand-rolled for the same reason `FormLayout`'s parser
// is (the grammar is tiny), and to keep this file framework-free.
//
// Attribute families, hyphenated rather than colon-prefixed: a colon is an XML namespace prefix and
// a real editor rejects `on:activate` as unbound (ONTOLOGY R-15).
//
//   <tag>            a kind tag; anything else is an error
//   attr="v"         a static aspect
//   data-x="a.b"     a read binding against the state object
//   item-x="a.b"     a read binding against the current collection item
//   on-x="key"       an event bound to an operation key — the only outbound edge
//

import { type Binding, type Node, type Tag, checkBindings, validate } from './model';

export class TemplateParseError extends Error {
  readonly _tag = 'TemplateParseError';
  constructor(
    message: string,
    readonly position?: number,
  ) {
    super(position === undefined ? message : `${message} (at position ${position})`);
  }
}

// Attribute values may contain `>`, so the attribute region matches quoted strings as units.
const TAG_RE = /<\s*(\/?)\s*([\w-]+)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)\s*>/g;
const ATTR_RE = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

type Token =
  | { type: 'open'; name: string; attrs: Record<string, string>; selfClosing: boolean; position: number }
  | { type: 'close'; name: string; position: number };

const parseAttrs = (raw: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_RE.exec(raw)) !== null) {
    const [, key, doubleQuoted, singleQuoted] = match;
    attrs[key] = doubleQuoted ?? singleQuoted;
  }
  return attrs;
};

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  let cursor = 0;
  while ((match = TAG_RE.exec(input)) !== null) {
    // Text content is not part of the grammar: a template describes structure, and a bound string
    // is a `display` node with a binding, never a text child.
    const between = input.slice(cursor, match.index);
    if (between.trim().length > 0) {
      throw new TemplateParseError(`unexpected text '${between.trim()}'`, cursor);
    }
    const [, closing, name, rawAttrs, selfClosing] = match;
    tokens.push(
      closing
        ? { type: 'close', name, position: match.index }
        : { type: 'open', name, attrs: parseAttrs(rawAttrs), selfClosing: !!selfClosing, position: match.index },
    );
    cursor = match.index + match[0].length;
  }
  if (input.slice(cursor).trim().length > 0) {
    throw new TemplateParseError(`unexpected trailing text`, cursor);
  }
  return tokens;
};

const toBinding = (from: Binding['from'], raw: string): Binding => ({ from, path: raw.split('.').filter(Boolean) });

const toNode = (name: string, attrs: Record<string, string>, children: Node[], position: number): Node => {
  const props: Record<string, string | number | boolean> = {};
  const data: Record<string, Binding> = {};
  const events: Record<string, string> = {};

  for (const [key, value] of Object.entries(attrs)) {
    // Intrinsic binding attributes: `when`/`on` are state bindings despite the missing `data-`
    // prefix — conditionality binds against published state by construction.
    if (
      (name === 'show' && key === 'when') ||
      (name === 'switch' && key === 'on') ||
      (name === 'control' && key === 'enabled')
    ) {
      data[key] = toBinding('state', value);
    } else if (key.startsWith('data-')) {
      data[key.slice(5)] = toBinding('state', value);
    } else if (key.startsWith('item-')) {
      data[key.slice(5)] = toBinding('item', value);
    } else if (key.startsWith('on-')) {
      events[key.slice(3)] = value;
    } else {
      // Numeric and boolean literals are narrowed here so the renderer never parses strings.
      props[key] =
        value === 'true' ? true : value === 'false' ? false : /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
    }
  }

  const node: Node = {
    tag: name as Tag,
    ...(Object.keys(props).length ? { props } : null),
    ...(Object.keys(data).length ? { data } : null),
    ...(Object.keys(events).length ? { events } : null),
    ...(children.length ? { children } : null),
  };

  try {
    validate({ ...node, children: [] });
  } catch (err) {
    throw new TemplateParseError((err as Error).message, position);
  }
  return node;
};

/** Parse an XML template into the model. Throws on an unknown tag rather than dropping it (R-8). */
export const parse = (input: string): Node => {
  const tokens = tokenize(input);
  const stack: { name: string; attrs: Record<string, string>; children: Node[]; position: number }[] = [];
  let root: Node | undefined;

  const close = (frame: (typeof stack)[number]) => {
    const node = toNode(frame.name, frame.attrs, frame.children, frame.position);
    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children.push(node);
    } else if (root) {
      throw new TemplateParseError('a template has exactly one root element', frame.position);
    } else {
      root = node;
    }
  };

  for (const token of tokens) {
    if (token.type === 'open') {
      const frame = { name: token.name, attrs: token.attrs, children: [], position: token.position };
      if (token.selfClosing) {
        close(frame);
      } else {
        stack.push(frame);
      }
    } else {
      const frame = stack.pop();
      if (!frame) {
        throw new TemplateParseError(`unmatched </${token.name}>`, token.position);
      }
      if (frame.name !== token.name) {
        throw new TemplateParseError(`expected </${frame.name}>, found </${token.name}>`, token.position);
      }
      close(frame);
    }
  }

  if (stack.length) {
    throw new TemplateParseError(`unclosed <${stack[stack.length - 1].name}>`, stack[stack.length - 1].position);
  }
  if (!root) {
    throw new TemplateParseError('empty template');
  }
  // The root is the template's boundary: `container` gives the declarations (`id`, `var`, `use`)
  // one fixed home, the way a QML root item or an Android layout's <data> block does.
  if (root.tag !== 'container') {
    throw new TemplateParseError(`the root element must be a 'container', found '${root.tag}'`);
  }
  // The per-node validation above cannot see parents or children; the full-tree pass enforces the
  // structural rules (a `let` needs an enclosing id, a `fallback` needs its `show`) and the
  // closed-resolution rule (every state binding's first segment names a declaration).
  try {
    validate(root);
    checkBindings(root);
  } catch (err) {
    throw new TemplateParseError((err as Error).message);
  }
  return root;
};
