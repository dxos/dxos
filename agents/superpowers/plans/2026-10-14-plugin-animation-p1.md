# plugin-animation P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@dxos/animation`, a pure TypeScript library that expands a parametric network template into a laid-out graph, compiles an MDL `flow` script into a timeline, and evaluates the complete scene state at any time `t`; plus a reusable MDL block parser and the `flow` dialect in `@dxos/deus`.

**Architecture:** `@dxos/deus/parser` turns MDL text into blocks of plain values. `@dxos/animation` reads a `flow` block into typed steps, builds the graph (expand → layout → links), schedules the steps, and compiles tracks (camera, visibility, properties, text, packets) into a `Timeline`. `evaluate(timeline, t)` is a pure function over that timeline; nothing in the library reads the clock or `Math.random`.

**Tech Stack:** TypeScript, Effect Schema (`effect/Schema`), vitest, moon.

**Spec:** `agents/superpowers/specs/2026-10-14-plugin-animation-design.md`

## Global Constraints

- New packages set `"private": true`. In-repo dependencies use `workspace:*`; external ones use `catalog:`.
- Every new `.ts` file starts with the header `//\n// Copyright 2026 DXOS.org\n//` followed by a blank line.
- Relative imports carry the `.ts` extension. Import Schema as `import * as Schema from 'effect/Schema';`.
- No `as any`, no `as unknown as T`, no non-null `!`. `as const` is fine.
- `@dxos/animation` never calls `Math.random`, `Date.now` or `performance.now`. All randomness comes from `createRandom(seed)`.
- Times inside the library are milliseconds. Script durations are text (`2s`, `200ms`, `1m20s`) or numbers of seconds.
- Run `pnpm format` before every commit. CI checks `oxfmt --check`.
- Commit messages are `scope: description` and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **An unquoted hex colour** (`color: #5f8fae`) is read as a comment, leaving `color:` empty. Expect a diagnostic that tells the author to quote it. Tested in Task 6.
2. **A selector that matches nothing** in `camera`, `show`, `set` or `send` must produce an error diagnostic naming the selector, never a silent no-op. Tested in Tasks 7 and 8.
3. **`send` between networks with no route** must produce one warning and no packets, not a crash or an endless search. Tested in Task 8.
4. **A flow whose steps all have zero length** has duration 0. `evaluate(timeline, 0)` must still return the caption. Tested in Task 9.
5. **Times outside `[0, duration]`** (scrubbing past the end, negative seeks) clamp to the range and return the same state as the boundary. Tested in Task 9.

---

### Task 1: MDL block parser in `@dxos/deus`

**Files:**

- Create: `packages/reflect/deus/src/parser/types.ts`
- Create: `packages/reflect/deus/src/parser/values.ts`
- Create: `packages/reflect/deus/src/parser/parse.ts`
- Create: `packages/reflect/deus/src/parser/index.ts`
- Test: `packages/reflect/deus/src/parser/values.test.ts`, `packages/reflect/deus/src/parser/parse.test.ts`
- Modify: `packages/reflect/deus/package.json` (add the `./parser` export)
- Modify: `packages/reflect/deus/vite.config.ts` (add the `parser` entry)

**Interfaces:**

- Produces: `parseMdl(source: string): MdlBlock[]`, `parseInline(source: string, line?: number): MdlValue`, `stripComment(text: string): string`, types `MdlValue`, `MdlMap`, `MdlBlock`, class `MdlSyntaxError { line: number; column: number }`. Import path: `@dxos/deus/parser`.

- [ ] **Step 1: Write the failing tests**

`packages/reflect/deus/src/parser/values.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseInline, stripComment } from './values.ts';

describe('parseInline', () => {
  test('scalars', ({ expect }) => {
    expect(parseInline('2.5')).toBe(2.5);
    expect(parseInline('-3')).toBe(-3);
    expect(parseInline('true')).toBe(true);
    expect(parseInline('null')).toBe(null);
    expect(parseInline('A message is typed: on the phone')).toBe('A message is typed: on the phone');
    expect(parseInline('"quoted, text"')).toBe('quoted, text');
  });

  test('inline maps and lists', ({ expect }) => {
    expect(parseInline('{ view: iso, focus: home/phone, zoom: 2.5, over: 2s }')).toEqual({
      view: 'iso',
      focus: 'home/phone',
      zoom: 2.5,
      over: '2s',
    });
    expect(parseInline('{ home/phone.app: chat }')).toEqual({ 'home/phone.app': 'chat' });
    expect(parseInline('{ path: [{ fit: cloud }, { focus: cloud/s2, zoom: 1.2 }], over: 5s }')).toEqual({
      path: [{ fit: 'cloud' }, { focus: 'cloud/s2', zoom: 1.2 }],
      over: '5s',
    });
    expect(parseInline("{ target: 'ring-*', stagger: 200ms }")).toEqual({ target: 'ring-*', stagger: '200ms' });
    expect(parseInline("{ color: '#5f8fae' }")).toEqual({ color: '#5f8fae' });
    expect(parseInline('[a, b, 3]')).toEqual(['a', 'b', 3]);
    expect(parseInline('{}')).toEqual({});
    expect(parseInline('[]')).toEqual([]);
  });

  test('errors carry the line', ({ expect }) => {
    expect(() => parseInline('{ view iso }', 4)).toThrow(/line 5/);
    expect(() => parseInline("{ a: 'open }")).toThrow(/Unterminated/);
    expect(() => parseInline('{ a: 1 } trailing')).toThrow(/Unexpected text/);
  });
});

describe('stripComment', () => {
  test('removes trailing comments only outside quotes', ({ expect }) => {
    expect(stripComment('zoom: 2   # close up')).toBe('zoom: 2');
    expect(stripComment("caption: it's fine # note")).toBe("caption: it's fine");
    expect(stripComment("color: '#5f8fae'")).toBe("color: '#5f8fae'");
    expect(stripComment('color: #5f8fae')).toBe('color:');
    expect(stripComment('# whole line')).toBe('');
  });
});
```

`packages/reflect/deus/src/parser/parse.test.ts`:

````ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseMdl } from './parse.ts';

const FLOW = [
  'flow F-1: From phone to cloud   # demo',
  '  seed: 7',
  '  desc: |',
  '    Line one',
  '',
  '    Line two',
  '  steps:',
  '    - name: Close up',
  '      camera: { view: iso, focus: home/phone, zoom: 2.5, over: 2s }',
  '      caption: A message is typed on the phone',
  '    # a comment between steps',
  '    - name: Top view',
  '      with: previous',
  '      show:',
  "        - { target: 'ring-*', stagger: 200ms }",
  '        - cloud',
  '  tags: [demo, network]',
].join('\n');

describe('parseMdl', () => {
  test('parses a block with nested steps', ({ expect }) => {
    expect(parseMdl(FLOW)).toEqual([
      {
        type: 'flow',
        id: 'F-1',
        title: 'From phone to cloud',
        line: 0,
        fields: {
          seed: 7,
          desc: 'Line one\n\nLine two',
          steps: [
            {
              name: 'Close up',
              camera: { view: 'iso', focus: 'home/phone', zoom: 2.5, over: '2s' },
              caption: 'A message is typed on the phone',
            },
            { name: 'Top view', with: 'previous', show: [{ target: 'ring-*', stagger: '200ms' }, 'cloud'] },
          ],
          tags: ['demo', 'network'],
        },
      },
    ]);
  });

  test('nested maps, prose lists, several blocks, CRLF', ({ expect }) => {
    const source = [
      'test S-1',
      '  given:',
      '    - space: a space is open',
      '    - an identity exists',
      'ext b',
      '  network:',
      '    kind: cloud',
      '    count: 3',
    ].join('\r\n');
    expect(parseMdl(source)).toEqual([
      { type: 'test', id: 'S-1', line: 0, fields: { given: [{ space: 'a space is open' }, 'an identity exists'] } },
      { type: 'ext', id: 'b', line: 4, fields: { network: { kind: 'cloud', count: 3 } } },
    ]);
  });

  test('reads blocks from markdown fences', ({ expect }) => {
    const markdown = [
      '# Title',
      '',
      '```mdl',
      'ext a',
      '  uri: x',
      '```',
      '',
      'text',
      '```mdl',
      'suite S-1',
      '  tests: [QA-1]',
      '```',
    ].join('\n');
    expect(parseMdl(markdown)).toEqual([
      { type: 'ext', id: 'a', line: 3, fields: { uri: 'x' } },
      { type: 'suite', id: 'S-1', line: 9, fields: { tests: ['QA-1'] } },
    ]);
  });

  test('reports the line of indentation and duplicate errors', ({ expect }) => {
    expect(() => parseMdl(['flow F-1', '  steps:', '    - name: a', '       bad: x'].join('\n'))).toThrow(
      /Unexpected indentation \(line 4\)/,
    );
    expect(() => parseMdl(['flow F-1', '  seed: 1', '  seed: 2'].join('\n'))).toThrow(
      /Duplicate field "seed" \(line 3\)/,
    );
    expect(() => parseMdl('  orphan: 1')).toThrow(/column 0/);
  });
});
````

- [ ] **Step 2: Run the tests to verify they fail**

Run: `moon run deus:test -- src/parser`
Expected: FAIL, cannot resolve `./values.ts` and `./parse.ts`.

- [ ] **Step 3: Write the implementation**

`packages/reflect/deus/src/parser/types.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

/** A value in an MDL block body: a scalar, a list, or a map. */
export type MdlValue = string | number | boolean | null | MdlValue[] | MdlMap;

export type MdlMap = { [key: string]: MdlValue };

/** One block: the header line `<type> [<id>][: <title>]` and its indented fields. */
export type MdlBlock = {
  type: string;
  id?: string;
  title?: string;
  fields: MdlMap;
  /** Zero-based line of the header in the source. */
  line: number;
};

/** Raised for malformed MDL; `line` is zero-based. */
export class MdlSyntaxError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column = 0,
  ) {
    super(`${message} (line ${line + 1})`);
    this.name = 'MdlSyntaxError';
  }
}
```

`packages/reflect/deus/src/parser/values.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type MdlMap, MdlSyntaxError, type MdlValue } from './types.ts';

const NUMBER = /^-?\d+(?:\.\d+)?$/;

const toScalar = (raw: string): MdlValue => {
  const text = raw.trim();
  if (NUMBER.test(text)) {
    return Number(text);
  }
  if (text === 'true' || text === 'false') {
    return text === 'true';
  }
  if (text === 'null' || text === '~') {
    return null;
  }
  return text;
};

/** Removes a trailing `# comment`; `#` starts a comment only at the start or after whitespace, outside quotes. */
export const stripComment = (text: string): string => {
  let quote: string | undefined;
  for (let index = 0; index < text.length; index++) {
    const char = text.charAt(index);
    const previous = index === 0 ? ' ' : text.charAt(index - 1);
    if (quote !== undefined) {
      if (char === quote) {
        quote = undefined;
      }
    } else if ((char === '"' || char === "'") && /[\s{[,:]/.test(previous)) {
      quote = char;
    } else if (char === '#' && /\s/.test(previous)) {
      return text.slice(0, index).trimEnd();
    }
  }
  return text.trimEnd();
};

/** Parses a field value: a scalar, a quoted string, or a flow-style `{ map }` or `[list]`. */
export const parseInline = (source: string, line = 0): MdlValue => {
  const text = source.trim();
  const first = text.charAt(0);
  if (first !== '{' && first !== '[' && first !== '"' && first !== "'") {
    return toScalar(text);
  }

  let pos = 0;
  const fail = (message: string): never => {
    throw new MdlSyntaxError(message, line, pos);
  };
  const peek = (): string => text.charAt(pos);
  const skip = (): void => {
    while (pos < text.length && /\s/.test(peek())) {
      pos++;
    }
  };
  const quoted = (): string => {
    const quote = peek();
    pos++;
    let out = '';
    while (pos < text.length && peek() !== quote) {
      if (peek() === '\\' && pos + 1 < text.length) {
        out += text.charAt(pos + 1);
        pos += 2;
      } else {
        out += peek();
        pos++;
      }
    }
    if (pos >= text.length) {
      fail('Unterminated string');
    }
    pos++;
    return out;
  };
  const bare = (stops: string): string => {
    const start = pos;
    while (pos < text.length && !stops.includes(peek())) {
      pos++;
    }
    return text.slice(start, pos).trim();
  };
  const value = (): MdlValue => {
    skip();
    const char = peek();
    if (char === '{') {
      return map();
    }
    if (char === '[') {
      return list();
    }
    if (char === '"' || char === "'") {
      return quoted();
    }
    const raw = bare(',]}');
    if (raw === '') {
      fail('Expected a value');
    }
    return toScalar(raw);
  };
  const map = (): MdlMap => {
    pos++;
    const out: MdlMap = {};
    skip();
    if (peek() === '}') {
      pos++;
      return out;
    }
    for (;;) {
      skip();
      const char = peek();
      const key = char === '"' || char === "'" ? quoted() : bare(':,}');
      skip();
      if (key === '' || peek() !== ':') {
        fail('Expected "key: value"');
      }
      pos++;
      out[key] = value();
      skip();
      if (peek() === ',') {
        pos++;
        continue;
      }
      if (peek() === '}') {
        pos++;
        return out;
      }
      fail('Expected "," or "}"');
    }
  };
  const list = (): MdlValue[] => {
    pos++;
    const out: MdlValue[] = [];
    skip();
    if (peek() === ']') {
      pos++;
      return out;
    }
    for (;;) {
      out.push(value());
      skip();
      if (peek() === ',') {
        pos++;
        continue;
      }
      if (peek() === ']') {
        pos++;
        return out;
      }
      fail('Expected "," or "]"');
    }
  };

  const result = value();
  skip();
  if (pos < text.length) {
    fail('Unexpected text after the value');
  }
  return result;
};
```

`packages/reflect/deus/src/parser/parse.ts`:

````ts
//
// Copyright 2026 DXOS.org
//

import { type MdlBlock, type MdlMap, MdlSyntaxError, type MdlValue } from './types.ts';
import { parseInline, stripComment } from './values.ts';

type Line = { indent: number; text: string; raw: string; line: number };

const FENCE_OPEN = /^\s*```mdl\s*$/;
const FENCE_CLOSE = /^\s*```\s*$/;
const HEADER = /^([A-Za-z_][\w-]*)(?:\s+([^\s:][^:]*?))?(?:\s*:\s*(.*))?$/;
const KEY = /^([A-Za-z_][\w-]*)(\?)?\s*:(?:\s+(.*))?$/;

const toLine = (raw: string, line: number): Line => ({
  indent: raw.length - raw.trimStart().length,
  text: raw.trim(),
  raw,
  line,
});

const isBlank = (line: Line): boolean => line.text === '' || line.text.startsWith('#');

const nextContent = (lines: Line[], start: number): number => {
  let index = start;
  for (;;) {
    const line = lines[index];
    if (line === undefined || !isBlank(line)) {
      return index;
    }
    index++;
  }
};

const extractBodies = (source: string): Line[][] => {
  const raw = source.split(/\r?\n/);
  if (!raw.some((text) => FENCE_OPEN.test(text))) {
    return [raw.map((text, line) => toLine(text, line))];
  }
  const bodies: Line[][] = [];
  let current: Line[] | undefined;
  for (const [line, text] of raw.entries()) {
    if (current === undefined) {
      if (FENCE_OPEN.test(text)) {
        current = [];
      }
    } else if (FENCE_CLOSE.test(text)) {
      bodies.push(current);
      current = undefined;
    } else {
      current.push(toLine(text, line));
    }
  }
  if (current !== undefined) {
    bodies.push(current);
  }
  return bodies;
};

const blockScalar = (lines: Line[], start: number, indent: number): [string, number] => {
  const taken: Line[] = [];
  let index = start;
  for (
    let line = lines[index];
    line !== undefined && (line.text === '' || line.indent > indent);
    line = lines[++index]
  ) {
    taken.push(line);
  }
  while (taken.length > 0 && taken[taken.length - 1]?.text === '') {
    taken.pop();
  }
  const margin = Math.min(...taken.filter((line) => line.text !== '').map((line) => line.indent));
  return [taken.map((line) => (line.text === '' ? '' : line.raw.slice(margin).trimEnd())).join('\n'), index];
};

const parseEntry = (lines: Line[], index: number, text: string, indent: number): [string, MdlValue, number] => {
  const lineNumber = lines[index]?.line ?? 0;
  const match = KEY.exec(stripComment(text));
  if (!match) {
    throw new MdlSyntaxError(`Expected "key: value", got "${text}"`, lineNumber);
  }
  const [, key = '', , rest] = match;
  if (rest === '|') {
    return [key, ...blockScalar(lines, index + 1, indent)];
  }
  if (rest !== undefined && rest !== '') {
    return [key, parseInline(rest, lineNumber), index + 1];
  }
  const childIndex = nextContent(lines, index + 1);
  const child = lines[childIndex];
  if (child === undefined || child.indent <= indent) {
    return [key, null, index + 1];
  }
  if (child.text === '-' || child.text.startsWith('- ')) {
    return [key, ...parseSequence(lines, childIndex, child.indent)];
  }
  return [key, ...parseMapping(lines, childIndex, child.indent)];
};

const parseMapping = (lines: Line[], start: number, indent: number, into: MdlMap = {}): [MdlMap, number] => {
  let index = start;
  for (;;) {
    index = nextContent(lines, index);
    const line = lines[index];
    if (line === undefined || line.indent < indent) {
      return [into, index];
    }
    if (line.indent > indent) {
      throw new MdlSyntaxError('Unexpected indentation', line.line);
    }
    const [key, value, next] = parseEntry(lines, index, line.text, indent);
    if (Object.hasOwn(into, key)) {
      throw new MdlSyntaxError(`Duplicate field "${key}"`, line.line);
    }
    into[key] = value;
    index = next;
  }
};

const parseSequence = (lines: Line[], start: number, indent: number): [MdlValue[], number] => {
  const items: MdlValue[] = [];
  let index = start;
  for (;;) {
    index = nextContent(lines, index);
    const line = lines[index];
    if (line === undefined || line.indent < indent) {
      return [items, index];
    }
    if (line.indent > indent || !(line.text === '-' || line.text.startsWith('- '))) {
      throw new MdlSyntaxError('Expected a list item "- …"', line.line);
    }
    const itemText = line.text.slice(1).trim();
    const itemIndent = indent + 2;
    if (KEY.test(stripComment(itemText))) {
      const [key, value, next] = parseEntry(lines, index, itemText, itemIndent);
      const [map, after] = parseMapping(lines, next, itemIndent, { [key]: value });
      items.push(map);
      index = after;
    } else {
      items.push(itemText === '' ? null : parseInline(stripComment(itemText), line.line));
      index++;
    }
  }
};

const parseBody = (lines: Line[]): MdlBlock[] => {
  const blocks: MdlBlock[] = [];
  let index = nextContent(lines, 0);
  for (let line = lines[index]; line !== undefined; line = lines[index]) {
    if (line.indent !== 0) {
      throw new MdlSyntaxError('Expected a block header at column 0', line.line);
    }
    const match = HEADER.exec(stripComment(line.text));
    if (!match) {
      throw new MdlSyntaxError(`Invalid block header "${line.text}"`, line.line);
    }
    const [, type = '', id, title] = match;
    const first = nextContent(lines, index + 1);
    const child = lines[first];
    let fields: MdlMap = {};
    let next = first;
    if (child !== undefined && child.indent > 0) {
      [fields, next] = parseMapping(lines, first, child.indent);
    }
    blocks.push({
      type,
      ...(id ? { id: id.trim() } : {}),
      ...(title ? { title: title.trim() } : {}),
      fields,
      line: line.line,
    });
    index = nextContent(lines, next);
  }
  return blocks;
};

/**
 * Parses MDL source into blocks.
 * Accepts a bare MDL body or a markdown document whose ```mdl fences hold the blocks.
 */
export const parseMdl = (source: string): MdlBlock[] => extractBodies(source).flatMap(parseBody);
````

`packages/reflect/deus/src/parser/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export { parseMdl } from './parse.ts';
export { type MdlBlock, type MdlMap, MdlSyntaxError, type MdlValue } from './types.ts';
export { parseInline, stripComment } from './values.ts';
```

In `packages/reflect/deus/vite.config.ts`, add the entry:

```ts
  entry: {
    index: 'src/index.ts',
    extension: 'src/extension/index.ts',
    parser: 'src/parser/index.ts',
  },
```

In `packages/reflect/deus/package.json`, add to `exports` after `./extension`:

```json
    "./parser": {
      "source": "./src/parser/index.ts",
      "types": "./dist/types/src/parser/index.d.ts",
      "import": "./dist/lib/parser.mjs"
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `moon run deus:test -- src/parser`
Expected: PASS, 7 tests.

- [ ] **Step 5: Build and commit**

Run: `moon run deus:build && pnpm format`
Expected: build succeeds.

```bash
git add packages/reflect/deus/src/parser packages/reflect/deus/package.json packages/reflect/deus/vite.config.ts
git commit -m "deus: MDL block parser exported as @dxos/deus/parser"
```

---

### Task 2: The `flow` dialect in `@dxos/deus`

**Files:**

- Modify: `packages/reflect/deus/src/extension/constants.ts` (add `'flow'`)
- Modify: `packages/reflect/deus/src/extension/fences.ts:12-24` (colour)
- Modify: `packages/reflect/deus/src/extension/complete.ts:12-22` (fields)
- Create: `packages/reflect/deus/lang/animation.mdl`
- Test: `packages/reflect/deus/src/extension/constants.test.ts`
- Modify: `packages/plugins/plugin-cloudflare/PLUGIN.mdl:28,110,123` (rename the QA `flow` to `test`)

**Interfaces:**

- Produces: `flow` is a known block type: no "Unknown block type" lint, a fence colour, and field completion.

- [ ] **Step 1: Write the failing test**

`packages/reflect/deus/src/extension/constants.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { BLOCK_TYPES } from './constants.ts';

describe('BLOCK_TYPES', () => {
  test('includes the animation flow block', ({ expect }) => {
    expect(BLOCK_TYPES).toContain('flow');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `moon run deus:test -- src/extension/constants.test.ts`
Expected: FAIL, `expected [...] to include 'flow'`.

- [ ] **Step 3: Register the block type**

In `constants.ts`, append `'flow',` after `'suite',` in `BLOCK_TYPES`.

In `fences.ts`, add to `BLOCK_TYPE_COLORS` after `suite`:

```ts
  flow: 'var(--color-sky-400)',
```

In `complete.ts`, add to `BLOCK_FIELDS` after `module`:

```ts
  flow: ['desc', 'seed', 'steps', 'tags'],
```

Create `packages/reflect/deus/lang/animation.mdl`:

````markdown
---
id: org.dxos.spec.animation
name: DSL.Animation
version: 1.0
extends:
  - org.dxos.spec.core
---

The animation dialect. A `flow` scripts a camera journey over a network of devices: where the
camera looks, what appears, which properties change, and which packets move. `@dxos/animation`
compiles a flow into a timeline whose state is a pure function of time.

## Extensions

| Term   | URI                     |
| ------ | ----------------------- |
| `flow` | `org.dxos.mdl.flow@1.0` |

```mdl
ext flow
  uri: org.dxos.mdl.flow@1.0
  desc: |
    A scripted animation. Steps run one after another; a step lasts as long as its camera move
    (`over`) or its `hold`, whichever is longer.
  fields:
    desc?:  Prose
    seed?:  Number                 # fixes layout and packets; default 0
    steps:  FlowStepList
    tags?:  TagList
  nesting: none

ext flow-step
  uri: org.dxos.mdl.flow-step@1.0
  desc: |
    One step of a flow. Selectors are path ids (`home/phone`), `*` for one segment, `**` for any
    depth, and commas for alternatives (`home, local-*`). Quote colours: `color: '#5f8fae'`.
  fields:
    name:       Prose
    with?:      previous               # start together with the previous step
    at?:        Duration               # pin the start, e.g. 1m20s
    hold?:      Duration
    camera?:    Camera                 # { view, focus | fit, zoom, follow, path, over, ease }
    show?:      Reveal | RevealList    # selector or { target, transition, stagger, exact }
    hide?:      Reveal | RevealList
    set?:       PropertyMap            # { <selector>.<prop>: value }
    send?:      Send | SendList        # { from, to, rate | count, color, until, speed }
    traffic?:   Traffic | TrafficList  # { scope, rate, until, speed }
    caption?:   Prose
    narration?: Prose
    mark?:      Prose                  # a chapter
```

## Example

```mdl
flow F-1: From phone to cloud
  seed: 7
  steps:
    - name: Close up
      camera: { view: iso, focus: home/phone, zoom: 2.5, over: 0s }
      set: { home/phone.app: chat }
      caption: A message is typed on the phone
      hold: 8s
    - name: The home network
      show: { target: home, exact: true }
      camera: { fit: home, over: 2s }
      hold: 6s
```
````

In `packages/plugins/plugin-cloudflare/PLUGIN.mdl`:

- line 28: delete the row `| \`flow\` | \`org.dxos.mdl.flow@1.0\` |`;
- line 110: change `flow QA-1: Connect a Cloudflare account` to `test QA-1: Connect a Cloudflare account`;
- line 123: change the stage key `  test:` to `  steps:`.

Then search the QA tooling for wording that calls QA blocks `flow`:

```bash
grep -rn "flow\` block\|flow blocks\|\`flow\`" tools/claude/plugins/dxos .agents/skills/composer-qa
```

In each hit that describes QA blocks, replace `flow` with `test`. Leave hits about autocue flow scripts (`flow.example.mjs`) unchanged.

- [ ] **Step 4: Run the tests and build**

Run: `moon run deus:test && moon run deus:build`
Expected: all tests PASS; the build type-checks `BLOCK_TYPE_COLORS` with the new key.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/reflect/deus packages/plugins/plugin-cloudflare/PLUGIN.mdl tools/claude/plugins/dxos .agents/skills/composer-qa
git commit -m "deus: flow block for scripted animations"
```

---

### Task 3: Scaffold `@dxos/animation` with seeded random and selectors

**Files:**

- Create: `packages/common/animation/package.json`, `moon.yml`, `tsconfig.json`, `vite.config.ts`
- Create: `packages/common/animation/src/index.ts`
- Create: `packages/common/animation/src/random.ts`, `src/path.ts`, `src/util.ts`
- Test: `packages/common/animation/src/random.test.ts`, `src/path.test.ts`

**Interfaces:**

- Produces:
  - `createRandom(seed: number): Random` where `Random = { next(): number; int(min: number, max: number): number; pick<T>(items: readonly T[]): T; shuffle<T>(items: readonly T[]): T[]; fork(salt: number | string): Random }`
  - `hash(text: string): number`
  - `type Path = string`, `joinPath(...parts: string[]): Path`, `matchSelector(selector: string): (path: Path) => boolean`
  - `at<T>(items: readonly T[], index: number): T` (throws when out of range), `clamp(value: number, min: number, max: number): number`, `lerp(a: number, b: number, k: number): number`

- [ ] **Step 1: Create the package files**

`packages/common/animation/package.json`:

```json
{
  "name": "@dxos/animation",
  "version": "0.14.0",
  "private": true,
  "description": "Network models, flow scripts and deterministic timelines for scripted network animations.",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "FSL-1.1-Apache-2.0",
  "author": "info@dxos.org",
  "sideEffects": false,
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "import": "./dist/lib/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": ["dist", "src"],
  "dependencies": {
    "@dxos/deus": "workspace:*",
    "effect": "catalog:"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

`moon.yml`:

```yaml
layer: library
language: typescript
tags:
  - ts-vite-build
  - ts-test
```

`tsconfig.json`:

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@dxos/typings", "node"]
  },
  "include": ["src"],
  "references": []
}
```

`vite.config.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  test: { node: true },
});
```

Run `pnpm install` in the background. Its `postinstall` toolbox step adds the package to `tsconfig.all.json` and `.changeset/config.json` and fills `tsconfig.json` references. Wait for it to finish before Step 3.

- [ ] **Step 2: Write the failing tests**

`src/random.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createRandom } from './random.ts';

describe('createRandom', () => {
  test('is deterministic per seed and forks independently', ({ expect }) => {
    const a = createRandom(7);
    const b = createRandom(7);
    const sequence = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(sequence);
    expect(sequence.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(createRandom(8).next()).not.toBe(sequence[0]);
    expect(createRandom(7).fork('x').next()).toBe(createRandom(7).fork('x').next());
    expect(createRandom(7).fork('x').next()).not.toBe(createRandom(7).fork('y').next());
  });

  test('int, pick and shuffle', ({ expect }) => {
    const random = createRandom(1);
    for (let k = 0; k < 50; k++) {
      const value = random.int(2, 4);
      expect(value >= 2 && value <= 4 && Number.isInteger(value)).toBe(true);
    }
    expect(['a', 'b']).toContain(random.pick(['a', 'b']));
    expect(() => random.pick([])).toThrow(/empty/);
    expect([...random.shuffle([1, 2, 3, 4])].sort()).toEqual([1, 2, 3, 4]);
  });
});
```

`src/path.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { joinPath, matchSelector } from './path.ts';

describe('matchSelector', () => {
  test('segments, wildcards and alternatives', ({ expect }) => {
    expect(joinPath('', 'cloud', 's2')).toBe('cloud/s2');
    expect(matchSelector('home/phone')('home/phone')).toBe(true);
    expect(matchSelector('*')('home')).toBe(true);
    expect(matchSelector('*')('home/phone')).toBe(false);
    expect(matchSelector('ring-*')('ring-3')).toBe(true);
    expect(matchSelector('cloud/**')('cloud/a/b')).toBe(true);
    expect(matchSelector('cloud/**')('cloud')).toBe(false);
    expect(matchSelector('**')('anything/at/all')).toBe(true);
    expect(matchSelector('home, local-*')('local-2')).toBe(true);
    expect(matchSelector('a.b')('axb')).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `moon run animation:test`
Expected: FAIL, cannot resolve `./random.ts` and `./path.ts`.

- [ ] **Step 4: Write the implementation**

`src/random.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

/** Deterministic random numbers: the same seed always yields the same sequence. */
export type Random = {
  /** A float in [0, 1). */
  next(): number;
  /** An integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** An independent stream; forks with the same salt are equal. */
  fork(salt: number | string): Random;
};

/** FNV-1a; maps a string to a 32-bit seed. */
export const hash = (text: string): number => {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.codePointAt(0) ?? 0;
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

/** Mulberry32. */
export const createRandom = (seed: number): Random => {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(items: readonly T[]): T => {
    const item = items[Math.floor(next() * items.length)];
    if (item === undefined) {
      throw new Error('pick() from an empty list');
    }
    return item;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick,
    shuffle: (items) => {
      const out = [...items];
      for (let index = out.length - 1; index > 0; index--) {
        const other = Math.floor(next() * (index + 1));
        const swap = out[index];
        const with_ = out[other];
        if (swap !== undefined && with_ !== undefined) {
          out[index] = with_;
          out[other] = swap;
        }
      }
      return out;
    },
    fork: (salt) => createRandom(hash(`${seed}:${salt}`)),
  };
};
```

`src/path.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

/** A path id joins network and node ids with "/", e.g. "cloud/s2/server-1". */
export type Path = string;

export const joinPath = (...parts: string[]): Path => parts.filter((part) => part !== '').join('/');

const escape = (text: string): string => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

const toRegExp = (selector: string): RegExp =>
  new RegExp(
    `^${selector
      .split('/')
      .map((segment) => (segment === '**' ? '.+' : segment.split('*').map(escape).join('[^/]*')))
      .join('/')}$`,
  );

/**
 * Compiles a selector: "*" matches within one segment, "**" any number of segments,
 * and commas separate alternatives ("home, local-*").
 */
export const matchSelector = (selector: string): ((path: Path) => boolean) => {
  const patterns = selector
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map(toRegExp);
  return (path) => patterns.some((pattern) => pattern.test(path));
};
```

`src/util.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

/** Indexes a list, throwing when the index is out of range. */
export const at = <T>(items: readonly T[], index: number): T => {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Index ${index} is out of range (length ${items.length})`);
  }
  return item;
};

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
```

`src/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './path.ts';
export * from './random.ts';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `moon run animation:test`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/common/animation tsconfig.all.json .changeset/config.json pnpm-lock.yaml
git commit -m "animation: scaffold @dxos/animation with seeded random and selectors"
```

---

### Task 4: Network template schema and expansion

**Files:**

- Create: `packages/common/animation/src/model/template.ts`
- Create: `packages/common/animation/src/model/graph.ts`
- Create: `packages/common/animation/src/model/expand.ts`
- Create: `packages/common/animation/src/model/index.ts`
- Test: `packages/common/animation/src/model/expand.test.ts`
- Modify: `packages/common/animation/src/index.ts`

**Interfaces:**

- Consumes: `createRandom`, `joinPath`, `Path` (Task 3).
- Produces:
  - Schemas and types `NodeType`, `NetworkKind`, `PropValue`, `Props`, `NodeSpec`, `NetworkSpec`, `LinkSpec`, `NetworkTemplate`.
  - Types `Vec2 = readonly [number, number]`, `GraphNode`, `GraphNetwork`, `GraphLink`, `Graph`; constant `NODE_RADIUS`; class `TemplateError`; `getNetwork(graph, path)`, `getNode(graph, path)`, `descendants(graph, path): { networks: Path[]; nodes: Path[] }`, `emptyGraph(): Graph`.
  - `expand(template: NetworkTemplate, seed: number): Graph` (positions all `[0, 0]`).

- [ ] **Step 1: Write the failing test**

`src/model/expand.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { expand } from './expand.ts';
import { type NetworkTemplate } from './template.ts';

const TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'home',
      kind: 'devices',
      nodes: [
        { id: 'phone', type: 'phone', props: { app: 'chat' } },
        { id: 'laptop', type: 'laptop' },
      ],
    },
    {
      id: 'cloud',
      kind: 'cloud',
      generate: { nodes: { type: 'server', count: [2, 2] }, networks: { template: 'region', count: [2, 3], depth: 2 } },
    },
  ],
  templates: { region: { id: 'region', kind: 'servers', generate: { nodes: { type: 'server', count: [2, 4] } } } },
};

describe('expand', () => {
  test('builds paths, depth and counts deterministically', ({ expect }) => {
    const graph = expand(TEMPLATE, 7);
    expect(graph).toEqual(expand(TEMPLATE, 7));
    expect(graph.roots).toEqual(['home', 'cloud']);
    expect(graph.nodes['home/phone']).toMatchObject({ type: 'phone', network: 'home', props: { app: 'chat' } });
    expect(graph.networks.cloud?.nodes).toEqual(['cloud/server-1', 'cloud/server-2']);

    const regions = graph.networks.cloud?.networks ?? [];
    expect(regions.length >= 2 && regions.length <= 3).toBe(true);
    const nested = graph.networks['cloud/region-1']?.networks ?? [];
    expect(nested.length >= 2 && nested.length <= 3).toBe(true);
    expect(graph.networks['cloud/region-1/region-1']).toMatchObject({
      depth: 2,
      parent: 'cloud/region-1',
      kind: 'servers',
    });
    expect(graph.networks['cloud/region-1/region-1']?.networks).toEqual([]);
    for (const path of graph.networks['cloud/region-1/region-1']?.nodes ?? []) {
      expect(path.startsWith('cloud/region-1/region-1/server-')).toBe(true);
    }
  });

  test('rejects duplicate ids and unknown templates', ({ expect }) => {
    expect(() =>
      expand(
        {
          networks: [
            { id: 'a', kind: 'devices' },
            { id: 'a', kind: 'devices' },
          ],
        },
        0,
      ),
    ).toThrow(/Duplicate network "a"/);
    expect(() =>
      expand(
        {
          networks: [{ id: 'a', kind: 'cloud', generate: { networks: { template: 'nope', count: [1, 1], depth: 1 } } }],
        },
        0,
      ),
    ).toThrow(/Unknown template "nope"/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `moon run animation:test -- src/model/expand.test.ts`
Expected: FAIL, cannot resolve `./expand.ts`.

- [ ] **Step 3: Write the implementation**

`src/model/template.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

export const NodeType = Schema.Literal('phone', 'laptop', 'server');
export type NodeType = Schema.Schema.Type<typeof NodeType>;

export const NetworkKind = Schema.Literal('devices', 'servers', 'cloud');
export type NetworkKind = Schema.Schema.Type<typeof NetworkKind>;

export const PropValue = Schema.Union(Schema.String, Schema.Number, Schema.Boolean);
export type PropValue = Schema.Schema.Type<typeof PropValue>;

export const Props = Schema.Record({ key: Schema.String, value: PropValue });
export type Props = Schema.Schema.Type<typeof Props>;

const Range = Schema.Tuple(Schema.Number, Schema.Number);
const Point = Schema.Tuple(Schema.Number, Schema.Number);

export const NodeSpec = Schema.Struct({
  id: Schema.String,
  type: NodeType,
  props: Schema.optional(Props),
});
export type NodeSpec = Schema.Schema.Type<typeof NodeSpec>;

export interface NetworkSpec {
  readonly id: string;
  readonly kind: NetworkKind;
  readonly props?: Props;
  readonly nodes?: readonly NodeSpec[];
  readonly networks?: readonly NetworkSpec[];
  readonly generate?: {
    readonly nodes?: { readonly type: NodeType; readonly count: readonly [number, number] };
    readonly networks?: {
      readonly template: string;
      readonly count: readonly [number, number];
      readonly depth: number;
    };
  };
  /** `at` is relative to the parent's centre; `near` places the network beside a sibling; `radius` is a minimum. */
  readonly layout?: { readonly at?: readonly [number, number]; readonly near?: string; readonly radius?: number };
}

export const NetworkSpec: Schema.Schema<NetworkSpec> = Schema.Struct({
  id: Schema.String,
  kind: NetworkKind,
  props: Schema.optional(Props),
  nodes: Schema.optional(Schema.Array(NodeSpec)),
  networks: Schema.optional(Schema.Array(Schema.suspend((): Schema.Schema<NetworkSpec> => NetworkSpec))),
  generate: Schema.optional(
    Schema.Struct({
      nodes: Schema.optional(Schema.Struct({ type: NodeType, count: Range })),
      networks: Schema.optional(
        Schema.Struct({
          template: Schema.String,
          count: Range,
          depth: Schema.Number.pipe(Schema.int(), Schema.positive()),
        }),
      ),
    }),
  ),
  layout: Schema.optional(
    Schema.Struct({
      at: Schema.optional(Point),
      near: Schema.optional(Schema.String),
      radius: Schema.optional(Schema.Number),
    }),
  ),
});

export const LinkSpec = Schema.Union(
  Schema.Struct({ from: Schema.String, to: Schema.String }),
  Schema.Struct({
    rule: Schema.Literal('nearby'),
    k: Schema.Number.pipe(Schema.int(), Schema.positive()),
    scope: Schema.String,
  }),
  Schema.Struct({
    rule: Schema.Literal('cloud'),
    scope: Schema.String,
    ratio: Schema.Number.pipe(Schema.between(0, 1)),
  }),
);
export type LinkSpec = Schema.Schema.Type<typeof LinkSpec>;

export const NetworkTemplate = Schema.Struct({
  networks: Schema.Array(NetworkSpec),
  templates: Schema.optional(Schema.Record({ key: Schema.String, value: NetworkSpec })),
  links: Schema.optional(Schema.Array(LinkSpec)),
});
export type NetworkTemplate = Schema.Schema.Type<typeof NetworkTemplate>;
```

`src/model/graph.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Path } from '../path.ts';

import { type NetworkKind, type NodeType, type PropValue } from './template.ts';

export type Vec2 = readonly [number, number];

/** Radius of each node type's footprint on the ground plane, in world units. */
export const NODE_RADIUS: Record<NodeType, number> = { phone: 210, laptop: 220, server: 110 };

export type GraphNode = {
  path: Path;
  id: string;
  type: NodeType;
  network: Path;
  props: Record<string, PropValue>;
  position: Vec2;
};

export type GraphNetwork = {
  path: Path;
  id: string;
  kind: NetworkKind;
  parent?: Path;
  depth: number;
  props: Record<string, PropValue>;
  nodes: Path[];
  networks: Path[];
  center: Vec2;
  radius: number;
  at?: Vec2;
  near?: string;
};

/** A link joins two networks; packets cross it from rim to rim. */
export type GraphLink = { from: Path; to: Path };

export type Graph = {
  roots: Path[];
  networks: Record<Path, GraphNetwork>;
  nodes: Record<Path, GraphNode>;
  links: GraphLink[];
};

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

export const emptyGraph = (): Graph => ({ roots: [], networks: {}, nodes: {}, links: [] });

export const getNetwork = (graph: Graph, path: Path): GraphNetwork => {
  const network = graph.networks[path];
  if (!network) {
    throw new TemplateError(`Unknown network "${path}"`);
  }
  return network;
};

export const getNode = (graph: Graph, path: Path): GraphNode => {
  const node = graph.nodes[path];
  if (!node) {
    throw new TemplateError(`Unknown node "${path}"`);
  }
  return node;
};

/** Every network and node below a network, depth first. */
export const descendants = (graph: Graph, path: Path): { networks: Path[]; nodes: Path[] } => {
  const network = getNetwork(graph, path);
  const out = { networks: [...network.networks], nodes: [...network.nodes] };
  for (const child of network.networks) {
    const below = descendants(graph, child);
    out.networks.push(...below.networks);
    out.nodes.push(...below.nodes);
  }
  return out;
};
```

`src/model/expand.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { joinPath } from '../path.ts';
import { createRandom } from '../random.ts';

import { type Graph, type GraphNetwork, TemplateError, emptyGraph } from './graph.ts';
import { type NetworkSpec, type NetworkTemplate, type NodeType, type Props } from './template.ts';

/** Expands a template into a graph; the same template and seed always yield the same graph. */
export const expand = (template: NetworkTemplate, seed: number): Graph => {
  const graph = emptyGraph();
  const random = createRandom(seed).fork('expand');
  const templates = template.templates ?? {};

  const addNetwork = (spec: NetworkSpec, parent: GraphNetwork | undefined, id: string): void => {
    const path = joinPath(parent?.path ?? '', id);
    if (graph.networks[path]) {
      throw new TemplateError(`Duplicate network "${path}"`);
    }
    const network: GraphNetwork = {
      path,
      id,
      kind: spec.kind,
      parent: parent?.path,
      depth: parent ? parent.depth + 1 : 0,
      props: { ...spec.props },
      nodes: [],
      networks: [],
      center: [0, 0],
      radius: spec.layout?.radius ?? 0,
      at: spec.layout?.at,
      near: spec.layout?.near,
    };
    graph.networks[path] = network;
    if (parent) {
      parent.networks.push(path);
    } else {
      graph.roots.push(path);
    }

    const counts: Partial<Record<NodeType, number>> = {};
    const addNode = (nodeId: string, type: NodeType, props: Props | undefined): void => {
      const nodePath = joinPath(path, nodeId);
      if (graph.nodes[nodePath]) {
        throw new TemplateError(`Duplicate node "${nodePath}"`);
      }
      graph.nodes[nodePath] = {
        path: nodePath,
        id: nodeId,
        type,
        network: path,
        props: { ...props },
        position: [0, 0],
      };
      network.nodes.push(nodePath);
      counts[type] = (counts[type] ?? 0) + 1;
    };

    for (const node of spec.nodes ?? []) {
      addNode(node.id, node.type, node.props);
    }
    const local = random.fork(path);
    const nodes = spec.generate?.nodes;
    if (nodes) {
      const count = local.int(nodes.count[0], nodes.count[1]);
      for (let index = 0; index < count; index++) {
        addNode(`${nodes.type}-${(counts[nodes.type] ?? 0) + 1}`, nodes.type, undefined);
      }
    }
    for (const child of spec.networks ?? []) {
      addNetwork(child, network, child.id);
    }
    const networks = spec.generate?.networks;
    if (networks) {
      const child = templates[networks.template];
      if (!child) {
        throw new TemplateError(`Unknown template "${networks.template}" in "${path}"`);
      }
      const count = local.int(networks.count[0], networks.count[1]);
      for (let index = 0; index < count; index++) {
        const nested: NetworkSpec =
          networks.depth > 1
            ? { ...child, generate: { ...child.generate, networks: { ...networks, depth: networks.depth - 1 } } }
            : child;
        addNetwork(nested, network, `${networks.template}-${index + 1}`);
      }
    }
  };

  for (const spec of template.networks) {
    addNetwork(spec, undefined, spec.id);
  }
  return graph;
};
```

`src/model/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './expand.ts';
export * from './graph.ts';
export * from './template.ts';
```

Add `export * from './model/index.ts';` to `src/index.ts`.

- [ ] **Step 4: Run the tests**

Run: `moon run animation:test -- src/model/expand.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/common/animation
git commit -m "animation: network template schema and deterministic expansion"
```

---

### Task 5: Layout and links

**Files:**

- Create: `packages/common/animation/src/model/layout.ts`
- Create: `packages/common/animation/src/model/links.ts`
- Create: `packages/common/animation/src/model/build.ts`
- Test: `packages/common/animation/src/model/layout.test.ts`
- Modify: `packages/common/animation/src/model/index.ts`

**Interfaces:**

- Consumes: `expand`, `Graph`, `getNetwork`, `getNode`, `NODE_RADIUS`, `LinkSpec`, `NetworkTemplate` (Task 4); `createRandom`, `matchSelector` (Task 3).
- Produces:
  - `pack(items: PackItem[], random: Random, gap?: number): { positions: Record<string, Vec2>; radius: number }` with `PackItem = { key: string; radius: number; at?: Vec2; near?: string }`.
  - `layout(graph: Graph, seed: number): Graph` (fills `center`, `radius`, `position`).
  - `resolveLinks(graph: Graph, specs: readonly LinkSpec[], seed: number): Graph`.
  - `buildGraph(template: NetworkTemplate, seed: number): Graph` = expand, then layout, then links.

- [ ] **Step 1: Write the failing test**

`src/model/layout.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildGraph } from './build.ts';
import { type Graph, NODE_RADIUS, getNetwork, getNode } from './graph.ts';
import { type NetworkTemplate } from './template.ts';

const TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'cloud',
      kind: 'cloud',
      layout: { at: [0, 0] },
      generate: { nodes: { type: 'server', count: [6, 6] }, networks: { template: 'region', count: [3, 3], depth: 2 } },
    },
    {
      id: 'home',
      kind: 'devices',
      layout: { near: 'cloud' },
      nodes: [
        { id: 'phone', type: 'phone' },
        { id: 'laptop', type: 'laptop' },
      ],
    },
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `site-${index + 1}`,
      kind: 'devices' as const,
      generate: { nodes: { type: 'phone' as const, count: [1, 3] as const } },
    })),
  ],
  templates: { region: { id: 'region', kind: 'servers', generate: { nodes: { type: 'server', count: [2, 3] } } } },
  links: [
    { rule: 'nearby', k: 1, scope: 'site-*' },
    { rule: 'cloud', scope: '*', ratio: 1 },
    { from: 'home', to: 'site-1' },
  ],
};

const distance = (a: readonly [number, number], b: readonly [number, number]): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

const circlesOf = (graph: Graph, path: string) => {
  const network = getNetwork(graph, path);
  return [
    ...network.nodes.map((node) => ({
      center: getNode(graph, node).position,
      radius: NODE_RADIUS[getNode(graph, node).type],
    })),
    ...network.networks.map((child) => ({
      center: getNetwork(graph, child).center,
      radius: getNetwork(graph, child).radius,
    })),
  ];
};

describe('layout', () => {
  test('children fit inside their parent and never overlap', ({ expect }) => {
    const graph = buildGraph(TEMPLATE, 3);
    expect(graph).toEqual(buildGraph(TEMPLATE, 3));
    for (const network of Object.values(graph.networks)) {
      const circles = circlesOf(graph, network.path);
      for (const circle of circles) {
        expect(distance(circle.center, network.center) + circle.radius).toBeLessThanOrEqual(network.radius + 1e-6);
      }
      circles.forEach((a, i) =>
        circles
          .slice(i + 1)
          .forEach((b) => expect(distance(a.center, b.center)).toBeGreaterThanOrEqual(a.radius + b.radius)),
      );
    }
    const roots = graph.roots.map((path) => getNetwork(graph, path));
    roots.forEach((a, i) =>
      roots
        .slice(i + 1)
        .forEach((b) => expect(distance(a.center, b.center)).toBeGreaterThanOrEqual(a.radius + b.radius)),
    );
  });

  test('pins and "near" placement', ({ expect }) => {
    const graph = buildGraph(TEMPLATE, 3);
    const cloud = getNetwork(graph, 'cloud');
    const home = getNetwork(graph, 'home');
    expect(cloud.center).toEqual([0, 0]);
    expect(distance(home.center, cloud.center)).toBeLessThan(cloud.radius + home.radius + 200);
  });

  test('links', ({ expect }) => {
    const graph = buildGraph(TEMPLATE, 3);
    const keys = graph.links.map((link) => `${link.from}|${link.to}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const root of graph.roots.filter((path) => path !== 'cloud')) {
      expect(
        graph.links.some(
          (link) => (link.from === root && link.to === 'cloud') || (link.to === root && link.from === 'cloud'),
        ),
      ).toBe(true);
    }
    expect(keys).toContain('home|site-1');
    expect(
      graph.links.filter((link) => link.from.startsWith('site-') && link.to.startsWith('site-')).length,
    ).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `moon run animation:test -- src/model/layout.test.ts`
Expected: FAIL, cannot resolve `./build.ts`.

- [ ] **Step 3: Write the implementation**

`src/model/layout.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Path } from '../path.ts';
import { type Random, createRandom } from '../random.ts';

import { type Graph, NODE_RADIUS, type Vec2, getNetwork, getNode } from './graph.ts';

const GAP = 60;
const PADDING = 80;
const STEP = 16;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export type PackItem = { key: string; radius: number; at?: Vec2; near?: string };

type Placed = { x: number; y: number; r: number };

/**
 * Packs circles without overlap: pinned items first, then the rest largest first, each at the free
 * spot nearest its origin (the centre, or the item named by `near`) along a sunflower spiral.
 */
export const pack = (
  items: PackItem[],
  random: Random,
  gap = GAP,
): { positions: Record<string, Vec2>; radius: number } => {
  const placed: Placed[] = [];
  const positions: Record<string, Vec2> = {};
  const fits = (x: number, y: number, r: number): boolean =>
    placed.every((p) => Math.hypot(x - p.x, y - p.y) >= r + p.r + gap);
  const put = (key: string, x: number, y: number, r: number): void => {
    positions[key] = [x, y];
    placed.push({ x, y, r });
  };

  for (const item of items) {
    if (item.at) {
      put(item.key, item.at[0], item.at[1], item.radius);
    }
  }

  const queue = items.filter((item) => !item.at).sort((a, b) => b.radius - a.radius || a.key.localeCompare(b.key));
  while (queue.length > 0) {
    const index = Math.max(
      0,
      queue.findIndex(
        (item) =>
          item.near === undefined ||
          positions[item.near] !== undefined ||
          !items.some((other) => other.key === item.near),
      ),
    );
    const [item] = queue.splice(index, 1);
    if (!item) {
      break;
    }
    const origin = (item.near !== undefined ? positions[item.near] : undefined) ?? [0, 0];
    const phase = random.next() * Math.PI * 2;
    let x = origin[0];
    let y = origin[1];
    for (let step = 1; !fits(x, y, item.radius); step++) {
      const distance = Math.sqrt(step) * STEP;
      x = origin[0] + Math.cos(step * GOLDEN_ANGLE + phase) * distance;
      y = origin[1] + Math.sin(step * GOLDEN_ANGLE + phase) * distance;
    }
    put(item.key, x, y, item.radius);
  }

  const radius = placed.reduce((max, p) => Math.max(max, Math.hypot(p.x, p.y) + p.r), 0);
  return { positions, radius };
};

/** Places every network and node: children are packed inside their parent, roots around the origin. */
export const layout = (graph: Graph, seed: number): Graph => {
  const random = createRandom(seed).fork('layout');
  const local: Record<Path, Record<string, Vec2>> = {};

  const size = (path: Path): number => {
    const network = getNetwork(graph, path);
    const items: PackItem[] = [
      ...network.nodes.map((node) => ({ key: node, radius: NODE_RADIUS[getNode(graph, node).type] })),
      ...network.networks.map((child) => {
        const childNetwork = getNetwork(graph, child);
        return {
          key: child,
          radius: size(child),
          at: childNetwork.at,
          near: childNetwork.near === undefined ? undefined : `${path}/${childNetwork.near}`,
        };
      }),
    ];
    const { positions, radius } = pack(items, random.fork(path));
    local[path] = positions;
    network.radius = Math.max(network.radius, radius + PADDING);
    return network.radius;
  };

  const roots = pack(
    graph.roots.map((path) => {
      const network = getNetwork(graph, path);
      return { key: path, radius: size(path), at: network.at, near: network.near };
    }),
    random.fork('roots'),
  );

  const place = (path: Path, center: Vec2): void => {
    const network = getNetwork(graph, path);
    network.center = center;
    const offsets = local[path] ?? {};
    for (const node of network.nodes) {
      const offset = offsets[node] ?? [0, 0];
      getNode(graph, node).position = [center[0] + offset[0], center[1] + offset[1]];
    }
    for (const child of network.networks) {
      const offset = offsets[child] ?? [0, 0];
      place(child, [center[0] + offset[0], center[1] + offset[1]]);
    }
  };
  for (const path of graph.roots) {
    place(path, roots.positions[path] ?? [0, 0]);
  }
  return graph;
};
```

`src/model/links.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Path, matchSelector } from '../path.ts';
import { createRandom } from '../random.ts';

import { type Graph, TemplateError, getNetwork } from './graph.ts';
import { type LinkSpec } from './template.ts';

/** Adds the links a template's rules describe; each pair of networks is linked at most once. */
export const resolveLinks = (graph: Graph, specs: readonly LinkSpec[], seed: number): Graph => {
  const random = createRandom(seed).fork('links');
  const paths = Object.keys(graph.networks);
  const seen = new Set(graph.links.map((link) => `${link.from}|${link.to}`));
  const add = (a: Path, b: Path): void => {
    if (a === b) {
      return;
    }
    const [from, to] = a < b ? [a, b] : [b, a];
    if (!seen.has(`${from}|${to}`)) {
      seen.add(`${from}|${to}`);
      graph.links.push({ from, to });
    }
  };
  const select = (selector: string): Path[] => paths.filter(matchSelector(selector));
  const distance = (a: Path, b: Path): number => {
    const [ax, ay] = getNetwork(graph, a).center;
    const [bx, by] = getNetwork(graph, b).center;
    return Math.hypot(ax - bx, ay - by);
  };
  const isInCloud = (path: Path): boolean => {
    for (let current: Path | undefined = path; current !== undefined; current = getNetwork(graph, current).parent) {
      if (getNetwork(graph, current).kind === 'cloud') {
        return true;
      }
    }
    return false;
  };

  specs.forEach((spec, index) => {
    if (!('rule' in spec)) {
      for (const from of select(spec.from)) {
        for (const to of select(spec.to)) {
          add(from, to);
        }
      }
      return;
    }
    if (spec.rule === 'nearby') {
      const scope = select(spec.scope);
      for (const a of scope) {
        scope
          .filter((b) => b !== a)
          .sort((b, c) => distance(a, b) - distance(a, c) || b.localeCompare(c))
          .slice(0, spec.k)
          .forEach((b) => add(a, b));
      }
      return;
    }
    const clouds = paths.filter((path) => getNetwork(graph, path).kind === 'cloud');
    if (clouds.length === 0) {
      throw new TemplateError('A "cloud" link rule needs a network of kind "cloud"');
    }
    const scope = select(spec.scope).filter((path) => !isInCloud(path));
    const chosen = random
      .fork(index)
      .shuffle(scope)
      .slice(0, Math.round(scope.length * spec.ratio));
    for (const path of chosen) {
      const nearest = [...clouds].sort((a, b) => distance(path, a) - distance(path, b))[0];
      if (nearest !== undefined) {
        add(path, nearest);
      }
    }
  });
  return graph;
};
```

`src/model/build.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { expand } from './expand.ts';
import { type Graph } from './graph.ts';
import { layout } from './layout.ts';
import { resolveLinks } from './links.ts';
import { type NetworkTemplate } from './template.ts';

/** Expands, lays out and links a template. */
export const buildGraph = (template: NetworkTemplate, seed: number): Graph =>
  resolveLinks(layout(expand(template, seed), seed), template.links ?? [], seed);
```

Append to `src/model/index.ts`:

```ts
export * from './build.ts';
export * from './layout.ts';
export * from './links.ts';
```

- [ ] **Step 4: Run the tests**

Run: `moon run animation:test -- src/model`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/common/animation
git commit -m "animation: circle-packing layout and link rules"
```

---

### Task 6: Durations and reading a `flow` block

**Files:**

- Create: `packages/common/animation/src/script/units.ts`
- Create: `packages/common/animation/src/script/flow.ts`
- Create: `packages/common/animation/src/script/index.ts`
- Test: `packages/common/animation/src/script/units.test.ts`, `src/script/flow.test.ts`
- Modify: `packages/common/animation/src/index.ts`

**Interfaces:**

- Consumes: `MdlBlock`, `MdlMap`, `MdlValue`, `parseMdl` from `@dxos/deus/parser` (Task 1).
- Produces:
  - `parseDuration(value: unknown): number | undefined` (ms), `parseRate(value: unknown): number | undefined` (per second), `formatDuration(ms: number): string`.
  - Types `Ease`, `ViewSpec`, `CameraSpec`, `ShowSpec`, `SetSpec`, `SendSpec`, `TrafficSpec`, `FlowStep`, `FlowScript`, `Diagnostic`; constants `VIEWS`, `APPS`; `readFlow(block: MdlBlock): { flow: FlowScript; diagnostics: Diagnostic[] }`.

```ts
export type Ease = 'linear' | 'in' | 'out' | 'in-out';
export type ViewSpec = { tilt: number; spin: number };
export type CameraSpec = {
  view?: ViewSpec;
  focus?: string;
  fit?: string;
  follow?: string;
  zoom?: number;
  path?: CameraSpec[];
  over: number;
  ease: Ease;
};
export type ShowSpec = { target: string; transition: 'grow' | 'fade' | 'none'; stagger: number; exact: boolean };
export type SetSpec = { selector: string; prop: string; value: string | number | boolean };
export type SendSpec = {
  from: string;
  to: string;
  rate?: number;
  count?: number;
  color?: string;
  until?: number;
  speed: number;
};
export type TrafficSpec = { scope: string; rate: number; until?: number; speed: number };
export type FlowStep = {
  name: string;
  with: boolean;
  at?: number;
  hold: number;
  camera?: CameraSpec;
  show: ShowSpec[];
  hide: ShowSpec[];
  set: SetSpec[];
  send: SendSpec[];
  traffic: TrafficSpec[];
  caption?: string;
  narration?: string;
  mark?: string;
};
export type FlowScript = { id: string; title?: string; seed?: number; steps: FlowStep[] };
export type Diagnostic = { severity: 'error' | 'warning'; message: string; step?: string; line?: number };
```

- [ ] **Step 1: Write the failing tests**

`src/script/units.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formatDuration, parseDuration, parseRate } from './units.ts';

describe('units', () => {
  test('durations', ({ expect }) => {
    expect(parseDuration('2s')).toBe(2000);
    expect(parseDuration('200ms')).toBe(200);
    expect(parseDuration('1m20s')).toBe(80000);
    expect(parseDuration('1.5s')).toBe(1500);
    expect(parseDuration(3)).toBe(3000);
    expect(parseDuration('0s')).toBe(0);
    expect(parseDuration('')).toBeUndefined();
    expect(parseDuration('soon')).toBeUndefined();
    expect(parseDuration(-1)).toBeUndefined();
  });

  test('rates and formatting', ({ expect }) => {
    expect(parseRate('4/s')).toBe(4);
    expect(parseRate('30/m')).toBe(0.5);
    expect(parseRate(2)).toBe(2);
    expect(parseRate('0/s')).toBeUndefined();
    expect(parseRate('fast')).toBeUndefined();
    expect(formatDuration(180000)).toBe('3:00');
    expect(formatDuration(65000)).toBe('1:05');
  });
});
```

`src/script/flow.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseMdl } from '@dxos/deus/parser';

import { readFlow } from './flow.ts';

const read = (body: string[]) => {
  const [block] = parseMdl(['flow F-1: Test', '  seed: 3', '  steps:', ...body].join('\n'));
  if (!block) {
    throw new Error('no block');
  }
  return readFlow(block);
};

describe('readFlow', () => {
  test('reads every verb', ({ expect }) => {
    const { flow, diagnostics } = read([
      '    - name: One',
      '      camera: { view: iso, focus: home/phone, zoom: 2.5, over: 2s, ease: linear }',
      '      set: { home/phone.app: chat, home.color: blue }',
      '      show: { target: home, exact: true }',
      '      caption: Hello',
      '      mark: Start',
      '      hold: 3s',
      '    - name: Two',
      '      with: previous',
      '      send: { from: home/phone, to: home/laptop, rate: 2/s, until: 4s }',
      "      traffic: { scope: 'ring-*', rate: 3/s }",
      "      hide: ['ring-1', { target: 'ring-2', transition: fade, stagger: 100ms }]",
      '      camera: { path: [{ fit: cloud }, { focus: cloud/a, zoom: 1.2 }], over: 5s }',
    ]);
    expect(diagnostics).toEqual([]);
    expect(flow.id).toBe('F-1');
    expect(flow.seed).toBe(3);
    expect(flow.steps[0]).toEqual({
      name: 'One',
      with: false,
      hold: 3000,
      camera: { view: { tilt: 55, spin: -35 }, focus: 'home/phone', zoom: 2.5, over: 2000, ease: 'linear' },
      show: [{ target: 'home', transition: 'grow', stagger: 0, exact: true }],
      hide: [],
      set: [
        { selector: 'home/phone', prop: 'app', value: 'chat' },
        { selector: 'home', prop: 'color', value: 'blue' },
      ],
      send: [],
      traffic: [],
      caption: 'Hello',
      mark: 'Start',
    });
    expect(flow.steps[1]).toMatchObject({
      with: true,
      send: [{ from: 'home/phone', to: 'home/laptop', rate: 2, until: 4000, speed: 1500 }],
      traffic: [{ scope: 'ring-*', rate: 3, speed: 1500 }],
      hide: [
        { target: 'ring-1', transition: 'grow', stagger: 0, exact: false },
        { target: 'ring-2', transition: 'fade', stagger: 100, exact: false },
      ],
      camera: {
        over: 5000,
        ease: 'in-out',
        path: [
          { fit: 'cloud', over: 1000, ease: 'in-out' },
          { focus: 'cloud/a', zoom: 1.2, over: 1000, ease: 'in-out' },
        ],
      },
    });
  });

  test('diagnostics', ({ expect }) => {
    const { diagnostics } = read([
      '    - name: Bad',
      '      with: previous',
      '      jump: 3',
      '      camera: { view: sideways, focus: a, fit: b, zoom: -1 }',
      '      set: { home: x, home/phone.app: radio }',
      '      send: { from: a, to: b, color: #5f8fae }',
      '      hold: soon',
    ]);
    expect(diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Unknown verb "jump"',
      'The first step cannot run "with: previous"',
      '"hold" must be a duration like 2s, 200ms or 1m20s',
      '"view" is iso, top, or { tilt, spin }',
      '"zoom" must be a positive number',
      '"camera" takes "focus" or "fit", not both',
      '"set" keys are <selector>.<property>, got "home"',
      '"app" must be one of chat, editor, sheet, table, kanban, call',
      '"send" needs "rate" or "count"',
      '"color" must be a quoted string such as \'#5f8fae\' (an unquoted # starts a comment)',
    ]);
    expect(diagnostics.every((diagnostic) => diagnostic.step === 'Bad' && diagnostic.severity === 'error')).toBe(true);
  });

  test('a flow without steps', ({ expect }) => {
    const [block] = parseMdl('flow F-2\n  seed: 1');
    expect(block && readFlow(block).diagnostics).toEqual([
      { severity: 'error', message: 'A flow needs a non-empty "steps:" list' },
    ]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `moon run animation:test -- src/script`
Expected: FAIL, cannot resolve `./units.ts` and `./flow.ts`.

- [ ] **Step 3: Write the implementation**

`src/script/units.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

const DURATION = /^(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?(?:(\d+(?:\.\d+)?)ms)?$/;
const RATE = /^(\d+(?:\.\d+)?)\s*\/\s*(s|m)$/;

/** Milliseconds from "2s", "200ms", "1m20s" or a number of seconds; undefined if malformed. */
export const parseDuration = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return value >= 0 ? value * 1000 : undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  const match = DURATION.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const [, minutes = '0', seconds = '0', millis = '0'] = match;
  return Number(minutes) * 60_000 + Number(seconds) * 1000 + Number(millis);
};

/** Events per second from "4/s", "30/m" or a number; undefined unless positive. */
export const parseRate = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return value > 0 ? value : undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const match = RATE.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const [, count = '0', unit] = match;
  const rate = Number(count) / (unit === 'm' ? 60 : 1);
  return rate > 0 ? rate : undefined;
};

/** "m:ss". */
export const formatDuration = (ms: number): string =>
  `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
```

`src/script/flow.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type MdlBlock, type MdlMap, type MdlValue } from '@dxos/deus/parser';

import { parseDuration, parseRate } from './units.ts';

export type Ease = 'linear' | 'in' | 'out' | 'in-out';
export type ViewSpec = { tilt: number; spin: number };
export type CameraSpec = {
  view?: ViewSpec;
  focus?: string;
  fit?: string;
  follow?: string;
  zoom?: number;
  path?: CameraSpec[];
  over: number;
  ease: Ease;
};
export type ShowSpec = { target: string; transition: 'grow' | 'fade' | 'none'; stagger: number; exact: boolean };
export type SetSpec = { selector: string; prop: string; value: string | number | boolean };
export type SendSpec = {
  from: string;
  to: string;
  rate?: number;
  count?: number;
  color?: string;
  until?: number;
  speed: number;
};
export type TrafficSpec = { scope: string; rate: number; until?: number; speed: number };
export type FlowStep = {
  name: string;
  with: boolean;
  at?: number;
  hold: number;
  camera?: CameraSpec;
  show: ShowSpec[];
  hide: ShowSpec[];
  set: SetSpec[];
  send: SendSpec[];
  traffic: TrafficSpec[];
  caption?: string;
  narration?: string;
  mark?: string;
};
export type FlowScript = { id: string; title?: string; seed?: number; steps: FlowStep[] };
export type Diagnostic = { severity: 'error' | 'warning'; message: string; step?: string; line?: number };

export const VIEWS = { iso: { tilt: 55, spin: -35 }, top: { tilt: 0, spin: 0 } } as const satisfies Record<
  string,
  ViewSpec
>;
export const APPS = ['chat', 'editor', 'sheet', 'table', 'kanban', 'call'] as const;

const DEFAULT_OVER = 1000;
const DEFAULT_SPEED = 1500;
const STEP_KEYS = new Set([
  'name',
  'with',
  'at',
  'hold',
  'camera',
  'show',
  'hide',
  'set',
  'send',
  'traffic',
  'caption',
  'narration',
  'mark',
]);
const CAMERA_KEYS = new Set(['view', 'focus', 'fit', 'follow', 'zoom', 'path', 'over', 'ease']);
const EASES: readonly Ease[] = ['linear', 'in', 'out', 'in-out'];
const TRANSITIONS: readonly ShowSpec['transition'][] = ['grow', 'fade', 'none'];

type Report = (message: string) => void;

const isMap = (value: MdlValue | undefined): value is MdlMap =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isEase = (value: unknown): value is Ease => EASES.some((ease) => ease === value);
const isTransition = (value: unknown): value is ShowSpec['transition'] =>
  TRANSITIONS.some((transition) => transition === value);
const asList = (value: MdlValue): MdlValue[] => (Array.isArray(value) ? value : [value]);

const duration = (value: MdlValue, field: string, report: Report): number | undefined => {
  const ms = parseDuration(value);
  if (ms === undefined) {
    report(`"${field}" must be a duration like 2s, 200ms or 1m20s`);
  }
  return ms;
};

const readCamera = (value: MdlValue, report: Report, topLevel: boolean): CameraSpec | undefined => {
  if (!isMap(value)) {
    report('"camera" takes a map, e.g. { view: iso, fit: home }');
    return undefined;
  }
  for (const key of Object.keys(value)) {
    if (!CAMERA_KEYS.has(key)) {
      report(`Unknown camera field "${key}"`);
    }
  }
  const spec: CameraSpec = { over: DEFAULT_OVER, ease: 'in-out' };
  const { view } = value;
  if (view !== undefined) {
    if (view === 'iso' || view === 'top') {
      spec.view = { ...VIEWS[view] };
    } else if (isMap(view) && typeof view.tilt === 'number' && typeof view.spin === 'number') {
      spec.view = { tilt: view.tilt, spin: view.spin };
    } else {
      report('"view" is iso, top, or { tilt, spin }');
    }
  }
  for (const key of ['focus', 'fit', 'follow'] as const) {
    const selector = value[key];
    if (selector !== undefined) {
      if (typeof selector === 'string') {
        spec[key] = selector;
      } else {
        report(`"${key}" takes a selector`);
      }
    }
  }
  if (value.zoom !== undefined) {
    if (typeof value.zoom === 'number' && value.zoom > 0) {
      spec.zoom = value.zoom;
    } else {
      report('"zoom" must be a positive number');
    }
  }
  if (value.over !== undefined) {
    spec.over = duration(value.over, 'over', report) ?? DEFAULT_OVER;
  }
  if (value.ease !== undefined) {
    if (isEase(value.ease)) {
      spec.ease = value.ease;
    } else {
      report(`"ease" is one of ${EASES.join(', ')}`);
    }
  }
  if (value.path !== undefined) {
    if (topLevel && Array.isArray(value.path)) {
      spec.path = value.path
        .map((key) => readCamera(key, report, false))
        .filter((key): key is CameraSpec => key !== undefined);
    } else {
      report('"path" is a list of keyframes at the top level of "camera"');
    }
  }
  if (spec.focus !== undefined && spec.fit !== undefined) {
    report('"camera" takes "focus" or "fit", not both');
  }
  if (spec.path !== undefined && (spec.focus !== undefined || spec.fit !== undefined || spec.zoom !== undefined)) {
    report('"camera" takes "path" or "focus"/"fit"/"zoom", not both');
  }
  return spec;
};

const readShow = (value: MdlValue, verb: string, report: Report): ShowSpec[] =>
  asList(value).flatMap((item): ShowSpec[] => {
    if (typeof item === 'string') {
      return [{ target: item, transition: 'grow', stagger: 0, exact: false }];
    }
    if (!isMap(item) || typeof item.target !== 'string') {
      report(`"${verb}" takes a selector or { target, transition, stagger, exact }`);
      return [];
    }
    const spec: ShowSpec = { target: item.target, transition: 'grow', stagger: 0, exact: item.exact === true };
    if (item.transition !== undefined) {
      if (isTransition(item.transition)) {
        spec.transition = item.transition;
      } else {
        report(`"transition" is one of ${TRANSITIONS.join(', ')}`);
      }
    }
    if (item.stagger !== undefined) {
      spec.stagger = duration(item.stagger, 'stagger', report) ?? 0;
    }
    return [spec];
  });

const readSet = (value: MdlValue, report: Report): SetSpec[] => {
  if (!isMap(value)) {
    report('"set" takes a map of { <selector>.<property>: value }');
    return [];
  }
  return Object.entries(value).flatMap(([key, propValue]): SetSpec[] => {
    const dot = key.lastIndexOf('.');
    if (dot <= 0 || dot === key.length - 1) {
      report(`"set" keys are <selector>.<property>, got "${key}"`);
      return [];
    }
    if (typeof propValue !== 'string' && typeof propValue !== 'number' && typeof propValue !== 'boolean') {
      report(`"${key}" must be a string, number or boolean`);
      return [];
    }
    const prop = key.slice(dot + 1);
    if (prop === 'app' && !APPS.some((app) => app === propValue)) {
      report(`"app" must be one of ${APPS.join(', ')}`);
      return [];
    }
    return [{ selector: key.slice(0, dot), prop, value: propValue }];
  });
};

const readColor = (item: MdlMap, report: Report): string | undefined => {
  if (item.color === undefined) {
    return undefined;
  }
  if (typeof item.color === 'string' && item.color !== '') {
    return item.color;
  }
  report('"color" must be a quoted string such as \'#5f8fae\' (an unquoted # starts a comment)');
  return undefined;
};

const readSpeed = (item: MdlMap, report: Report): number => {
  if (item.speed === undefined) {
    return DEFAULT_SPEED;
  }
  if (typeof item.speed === 'number' && item.speed > 0) {
    return item.speed;
  }
  report('"speed" must be a positive number of world units per second');
  return DEFAULT_SPEED;
};

const readSend = (value: MdlValue, report: Report): SendSpec[] =>
  asList(value).flatMap((item): SendSpec[] => {
    if (!isMap(item) || typeof item.from !== 'string' || typeof item.to !== 'string') {
      report('"send" takes { from, to, rate | count }');
      return [];
    }
    const spec: SendSpec = { from: item.from, to: item.to, speed: readSpeed(item, report) };
    if (item.rate !== undefined) {
      const rate = parseRate(item.rate);
      if (rate === undefined) {
        report('"rate" must look like 2/s or 30/m');
      } else {
        spec.rate = rate;
      }
    }
    if (item.count !== undefined) {
      if (typeof item.count === 'number' && Number.isInteger(item.count) && item.count > 0) {
        spec.count = item.count;
      } else {
        report('"count" must be a positive integer');
      }
    }
    if (spec.rate === undefined && spec.count === undefined) {
      report('"send" needs "rate" or "count"');
    }
    const color = readColor(item, report);
    if (color !== undefined) {
      spec.color = color;
    }
    if (item.until !== undefined) {
      spec.until = duration(item.until, 'until', report);
    }
    return [spec];
  });

const readTraffic = (value: MdlValue, report: Report): TrafficSpec[] =>
  asList(value).flatMap((item): TrafficSpec[] => {
    if (!isMap(item)) {
      report('"traffic" takes { scope, rate }');
      return [];
    }
    const rate = parseRate(item.rate);
    if (rate === undefined) {
      report('"traffic" needs a "rate" like 4/s');
      return [];
    }
    const spec: TrafficSpec = {
      scope: typeof item.scope === 'string' ? item.scope : '**',
      rate,
      speed: readSpeed(item, report),
    };
    if (item.until !== undefined) {
      spec.until = duration(item.until, 'until', report);
    }
    return [spec];
  });

const readText = (value: MdlValue, verb: string, report: Report): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  report(`"${verb}" takes text`);
  return undefined;
};

/** Reads a flow block into typed steps; problems become diagnostics rather than exceptions. */
export const readFlow = (block: MdlBlock): { flow: FlowScript; diagnostics: Diagnostic[] } => {
  const diagnostics: Diagnostic[] = [];
  const raw = block.fields.steps;
  if (!Array.isArray(raw) || raw.length === 0) {
    diagnostics.push({ severity: 'error', message: 'A flow needs a non-empty "steps:" list' });
  }
  const steps = (Array.isArray(raw) ? raw : []).flatMap((item, index): FlowStep[] => {
    const name = isMap(item) && typeof item.name === 'string' ? item.name : `Step ${index + 1}`;
    const report: Report = (message) => diagnostics.push({ severity: 'error', message, step: name });
    if (!isMap(item)) {
      report('A step is a map of verbs');
      return [];
    }
    for (const key of Object.keys(item)) {
      if (!STEP_KEYS.has(key)) {
        report(`Unknown verb "${key}"`);
      }
    }
    const step: FlowStep = { name, with: false, hold: 0, show: [], hide: [], set: [], send: [], traffic: [] };
    if (item.with !== undefined) {
      if (item.with !== 'previous') {
        report('"with" only accepts "previous"');
      } else if (index === 0) {
        report('The first step cannot run "with: previous"');
      } else {
        step.with = true;
      }
    }
    if (item.at !== undefined) {
      step.at = duration(item.at, 'at', report);
    }
    if (item.hold !== undefined) {
      step.hold = duration(item.hold, 'hold', report) ?? 0;
    }
    if (item.camera !== undefined) {
      step.camera = readCamera(item.camera, report, true);
    }
    if (item.show !== undefined) {
      step.show = readShow(item.show, 'show', report);
    }
    if (item.hide !== undefined) {
      step.hide = readShow(item.hide, 'hide', report);
    }
    if (item.set !== undefined) {
      step.set = readSet(item.set, report);
    }
    if (item.send !== undefined) {
      step.send = readSend(item.send, report);
    }
    if (item.traffic !== undefined) {
      step.traffic = readTraffic(item.traffic, report);
    }
    for (const verb of ['caption', 'narration', 'mark'] as const) {
      const value = item[verb];
      if (value !== undefined) {
        step[verb] = readText(value, verb, report);
      }
    }
    return [step];
  });
  const seed = typeof block.fields.seed === 'number' ? block.fields.seed : undefined;
  return { flow: { id: block.id ?? '', title: block.title, seed, steps }, diagnostics };
};
```

Note the order in the diagnostics test follows the reader: unknown verbs first, then `with`, `hold`, `camera`, `set`, `send`. If the implementation's order differs from the expected array, fix the implementation, not the test.

`src/script/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './flow.ts';
export * from './units.ts';
```

Add `export * from './script/index.ts';` to `src/index.ts`.

- [ ] **Step 4: Run the tests**

Run: `moon run animation:test -- src/script`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/common/animation
git commit -m "animation: read flow blocks into typed steps with diagnostics"
```

---

### Task 7: Compile camera, visibility, properties and text into a timeline

**Files:**

- Create: `packages/common/animation/src/timeline/types.ts`
- Create: `packages/common/animation/src/timeline/camera.ts`
- Create: `packages/common/animation/src/timeline/select.ts`
- Create: `packages/common/animation/src/timeline/compile.ts`
- Create: `packages/common/animation/src/timeline/index.ts`
- Test: `packages/common/animation/src/timeline/compile.test.ts`
- Modify: `packages/common/animation/src/index.ts`

**Interfaces:**

- Consumes: `buildGraph`, `Graph`, `emptyGraph`, `getNetwork`, `getNode`, `descendants`, `NODE_RADIUS`, `TemplateError`, `NetworkTemplate`, `Vec2` (Tasks 4–5); `readFlow`, `FlowStep`, `CameraSpec`, `Diagnostic`, `Ease`, `VIEWS` (Task 6); `parseMdl`, `MdlSyntaxError` (Task 1); `matchSelector`, `Path` (Task 3); `lerp`, `clamp` (Task 3).
- Produces:
  - Types `CameraPose = { center: Vec2; extent: number; tilt: number; spin: number }` (extent is the world radius visible across the shorter viewport side), `CameraSegment`, `VisibilityEvent`, `PropEvent`, `Caption`, `Mark`, `Narration`, `Packet`, `Timeline`, `TimedStep`.
  - `ease(kind: Ease, k: number): number`, `interpolatePose(from, to, k): CameraPose`, `resolvePose(graph, spec, from, report): CameraPose`.
  - `matchedPaths(graph, selector): Path[]`, `withDescendants(graph, path): Path[]`.
  - `schedule(steps: readonly FlowStep[]): TimedStep[]`, `compile(source: string, template: NetworkTemplate, options?: { flow?: string; seed?: number }): { timeline: Timeline; diagnostics: Diagnostic[] }`.

- [ ] **Step 1: Write the failing test**

`src/timeline/compile.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type NetworkTemplate } from '../model/index.ts';
import { readFlow } from '../script/index.ts';

import { compile, schedule } from './compile.ts';

const TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'a',
      kind: 'devices',
      nodes: [
        { id: 'p1', type: 'phone' },
        { id: 'p2', type: 'phone' },
      ],
    },
    { id: 'b', kind: 'devices', nodes: [{ id: 'l1', type: 'laptop' }] },
  ],
  links: [{ from: 'a', to: 'b' }],
};

const flow = (...steps: string[]) => ['flow T-1', '  seed: 1', '  steps:', ...steps].join('\n');

describe('schedule', () => {
  test('sequence, with, at and hold', ({ expect }) => {
    const { timed } = (() => {
      const result = compile(
        flow(
          '    - name: one',
          '      camera: { fit: a, over: 2s }',
          '    - name: two',
          '      with: previous',
          '      hold: 1s',
          '    - name: three',
          '      hold: 3s',
          '    - name: four',
          '      at: 10s',
          '      hold: 1s',
        ),
        TEMPLATE,
      );
      return { timed: result.timeline };
    })();
    expect(timed.duration).toBe(11000);
  });

  test('schedule() directly', ({ expect }) => {
    const steps = [
      { name: 'a', with: false, hold: 2000, show: [], hide: [], set: [], send: [], traffic: [] },
      { name: 'b', with: true, hold: 500, show: [], hide: [], set: [], send: [], traffic: [] },
      { name: 'c', with: false, hold: 1000, show: [], hide: [], set: [], send: [], traffic: [] },
    ];
    expect(schedule(steps).map(({ start, end }) => [start, end])).toEqual([
      [0, 2000],
      [0, 500],
      [2000, 3000],
    ]);
  });
});

describe('compile', () => {
  test('tracks', ({ expect }) => {
    const { timeline, diagnostics } = compile(
      flow(
        '    - name: start',
        '      camera: { view: top, fit: "*", over: 0s }',
        '      caption: Hello',
        '      hold: 1s',
        '    - name: reveal',
        '      show: { target: b, transition: fade }',
        '      set: { a/p1.app: chat }',
        '      camera: { focus: a/p1, ease: linear, over: 2s }',
        '      mark: Reveal',
      ),
      TEMPLATE,
    );
    expect(diagnostics).toEqual([]);
    expect(timeline.duration).toBe(3000);
    expect(timeline.hidden).toEqual(['b', 'b/l1']);
    expect(timeline.visibility.b).toEqual([{ at: 1000, visible: true, transition: 'fade' }]);
    expect(timeline.props).toEqual([{ path: 'a/p1', prop: 'app', value: 'chat', at: 1000 }]);
    expect(timeline.captions).toEqual([{ text: 'Hello', start: 0, end: 3000 }]);
    expect(timeline.marks).toEqual([{ name: 'Reveal', at: 1000 }]);
    expect(timeline.camera.map(({ start, end, ease }) => [start, end, ease])).toEqual([
      [0, 0, 'in-out'],
      [1000, 3000, 'linear'],
    ]);
    expect(timeline.camera[0]?.to.tilt).toBe(0);
    expect(timeline.camera[1]?.to.center).toEqual(timeline.graph.nodes['a/p1']?.position);
  });

  test('diagnostics', ({ expect }) => {
    const missing = compile(
      flow('    - name: x', '      camera: { fit: nowhere }', '      show: ghost', '      set: { nobody.label: x }'),
      TEMPLATE,
    );
    expect(missing.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      '"nowhere" matches nothing',
      '"ghost" matches nothing',
      '"nobody" matches nothing',
    ]);

    const overlap = compile(
      flow(
        '    - name: x',
        '      camera: { fit: a, over: 2s }',
        '    - name: y',
        '      with: previous',
        '      camera: { fit: b }',
      ),
      TEMPLATE,
    );
    expect(overlap.diagnostics).toEqual([
      { severity: 'warning', message: 'This camera move overlaps the previous one', step: 'y' },
    ]);

    const syntax = compile('flow T-1\n  steps:\n    - name: a\n       bad: x', TEMPLATE);
    expect(syntax.diagnostics[0]).toMatchObject({ severity: 'error', line: 3 });
    expect(compile('ext a', TEMPLATE).diagnostics).toEqual([
      { severity: 'error', message: 'The source has no flow block' },
    ]);
    expect(readFlow).toBeDefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `moon run animation:test -- src/timeline/compile.test.ts`
Expected: FAIL, cannot resolve `./compile.ts`.

- [ ] **Step 3: Write the implementation**

`src/timeline/types.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Graph, type PropValue, type Vec2 } from '../model/index.ts';
import { type Path } from '../path.ts';
import { type Ease, type FlowStep, type ShowSpec } from '../script/index.ts';

/** `extent` is the world radius visible across the shorter side of the viewport. */
export type CameraPose = { center: Vec2; extent: number; tilt: number; spin: number };

export type CameraSegment = { start: number; end: number; ease: Ease; from: CameraPose; to: CameraPose };

export type VisibilityEvent = { at: number; visible: boolean; transition: ShowSpec['transition'] };

export type PropEvent = { path: Path; prop: string; value: PropValue; at: number };

export type Caption = { text: string; start: number; end: number };

export type Mark = { name: string; at: number };

export type Narration = { text: string; at: number };

/** A packet's path from node to node; `lengths` are cumulative distances along `points`. */
export type Packet = {
  id: string;
  from: Path;
  to: Path;
  spawn: number;
  travel: number;
  points: Vec2[];
  lengths: number[];
  color: string;
};

export type Timeline = {
  duration: number;
  graph: Graph;
  initialCamera: CameraPose;
  camera: CameraSegment[];
  /** Paths that start invisible because a `show` reveals them later. */
  hidden: Path[];
  visibility: Record<Path, VisibilityEvent[]>;
  props: PropEvent[];
  captions: Caption[];
  marks: Mark[];
  narration: Narration[];
  /** Sorted by spawn time. */
  packets: Packet[];
  maxTravel: number;
};

export type TimedStep = { step: FlowStep; index: number; start: number; end: number };
```

`src/timeline/select.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Graph, descendants } from '../model/index.ts';
import { type Path, matchSelector } from '../path.ts';

/** Network and node paths a selector matches, sorted. */
export const matchedPaths = (graph: Graph, selector: string): Path[] => {
  const match = matchSelector(selector);
  return [...Object.keys(graph.networks), ...Object.keys(graph.nodes)].filter(match).sort();
};

/** A network with everything below it, or a node on its own. */
export const withDescendants = (graph: Graph, path: Path): Path[] => {
  if (!graph.networks[path]) {
    return [path];
  }
  const below = descendants(graph, path);
  return [path, ...below.networks, ...below.nodes];
};
```

`src/timeline/camera.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Graph, NODE_RADIUS, type Vec2 } from '../model/index.ts';
import { matchSelector } from '../path.ts';
import { type CameraSpec, type Ease } from '../script/index.ts';
import { lerp } from '../util.ts';

import { type CameraPose } from './types.ts';

const FOCUS_MARGIN = 1.6;
const FIT_MARGIN = 1.1;

type Circle = { center: Vec2; radius: number };

export const ease = (kind: Ease, k: number): number => {
  switch (kind) {
    case 'linear':
      return k;
    case 'in':
      return k * k * k;
    case 'out':
      return 1 - (1 - k) ** 3;
    case 'in-out':
      return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
  }
};

/** Extent interpolates geometrically so zooming feels even. */
export const interpolatePose = (from: CameraPose, to: CameraPose, k: number): CameraPose => ({
  center: [lerp(from.center[0], to.center[0], k), lerp(from.center[1], to.center[1], k)],
  extent: Math.exp(lerp(Math.log(from.extent), Math.log(to.extent), k)),
  tilt: lerp(from.tilt, to.tilt, k),
  spin: lerp(from.spin, to.spin, k),
});

export const circlesOf = (graph: Graph, selector: string): Circle[] => {
  const match = matchSelector(selector);
  return [
    ...Object.values(graph.networks)
      .filter((network) => match(network.path))
      .map((network) => ({ center: network.center, radius: network.radius })),
    ...Object.values(graph.nodes)
      .filter((node) => match(node.path))
      .map((node) => ({ center: node.position, radius: NODE_RADIUS[node.type] })),
  ];
};

/** The smallest circle around the circles' bounding box that contains all of them. */
export const boundsOf = (circles: readonly Circle[]): Circle => {
  const xs = circles.flatMap(({ center, radius }) => [center[0] - radius, center[0] + radius]);
  const ys = circles.flatMap(({ center, radius }) => [center[1] - radius, center[1] + radius]);
  const center: Vec2 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  const radius = circles.reduce(
    (max, circle) =>
      Math.max(max, Math.hypot(circle.center[0] - center[0], circle.center[1] - center[1]) + circle.radius),
    0,
  );
  return { center, radius };
};

/** The pose a camera command aims at, starting from `from`; problems go to `report`. */
export const resolvePose = (
  graph: Graph,
  spec: CameraSpec,
  from: CameraPose,
  report: (message: string) => void,
): CameraPose => {
  let { center, extent } = from;
  const focus = spec.focus ?? spec.follow;
  if (focus !== undefined) {
    const circles = circlesOf(graph, focus);
    if (circles.length === 0) {
      report(`"${focus}" matches nothing`);
    } else {
      const bounds = boundsOf(circles);
      center = bounds.center;
      extent = bounds.radius * FOCUS_MARGIN;
    }
  }
  if (spec.fit !== undefined) {
    const circles = circlesOf(graph, spec.fit);
    if (circles.length === 0) {
      report(`"${spec.fit}" matches nothing`);
    } else {
      const bounds = boundsOf(circles);
      center = bounds.center;
      extent = bounds.radius * FIT_MARGIN;
    }
  }
  if (spec.zoom !== undefined) {
    extent /= spec.zoom;
  }
  const view = spec.view ?? { tilt: from.tilt, spin: from.spin };
  return { center, extent, tilt: view.tilt, spin: view.spin };
};
```

`src/timeline/compile.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type MdlBlock, MdlSyntaxError, parseMdl } from '@dxos/deus/parser';

import { type Graph, type NetworkTemplate, TemplateError, buildGraph, emptyGraph } from '../model/index.ts';
import { type Diagnostic, type FlowScript, type FlowStep, VIEWS, readFlow } from '../script/index.ts';

import { boundsOf, circlesOf, resolvePose } from './camera.ts';
import { matchedPaths, withDescendants } from './select.ts';
import { type CameraPose, type TimedStep, type Timeline } from './types.ts';

export type CompileOptions = { flow?: string; seed?: number };
export type CompileResult = { timeline: Timeline; diagnostics: Diagnostic[] };

const stepLength = (step: FlowStep): number => Math.max(step.camera?.over ?? 0, step.hold);

/** Start and end of every step: after the previous step, with it, or at a pinned time. */
export const schedule = (steps: readonly FlowStep[]): TimedStep[] => {
  let cursor = 0;
  let previousStart = 0;
  return steps.map((step, index) => {
    const start = step.at ?? (step.with ? previousStart : cursor);
    const end = start + stepLength(step);
    previousStart = start;
    cursor = Math.max(cursor, end);
    return { step, index, start, end };
  });
};

const overview = (graph: Graph): CameraPose => {
  const circles = circlesOf(graph, '*');
  const bounds = circles.length > 0 ? boundsOf(circles) : { center: [0, 0] as const, radius: 1000 };
  return { center: bounds.center, extent: bounds.radius * 1.1, tilt: VIEWS.iso.tilt, spin: VIEWS.iso.spin };
};

const emptyTimeline = (graph: Graph): Timeline => ({
  duration: 0,
  graph,
  initialCamera: overview(graph),
  camera: [],
  hidden: [],
  visibility: {},
  props: [],
  captions: [],
  marks: [],
  narration: [],
  packets: [],
  maxTravel: 0,
});

const compileCamera = (timeline: Timeline, timed: TimedStep[], diagnostics: Diagnostic[]): void => {
  let pose = timeline.initialCamera;
  let busyUntil = -Infinity;
  const moves = timed.filter(({ step }) => step.camera !== undefined).sort((a, b) => a.start - b.start);
  for (const { step, start } of moves) {
    const camera = step.camera;
    if (!camera) {
      continue;
    }
    if (start < busyUntil) {
      diagnostics.push({ severity: 'warning', message: 'This camera move overlaps the previous one', step: step.name });
    }
    const keys = camera.path && camera.path.length > 0 ? camera.path : [camera];
    const slice = camera.over / keys.length;
    keys.forEach((key, index) => {
      const view = key.view ?? (index === 0 ? camera.view : undefined);
      const to = resolvePose(timeline.graph, { ...key, view }, pose, (message) =>
        diagnostics.push({ severity: 'error', message, step: step.name }),
      );
      timeline.camera.push({
        start: start + index * slice,
        end: start + (index + 1) * slice,
        ease: camera.ease,
        from: pose,
        to,
      });
      pose = to;
    });
    busyUntil = start + camera.over;
  }
};

const compileVisibility = (timeline: Timeline, timed: TimedStep[], diagnostics: Diagnostic[]): void => {
  const revealed = new Set<string>();
  for (const { step, start } of timed) {
    for (const [specs, visible] of [
      [step.show, true],
      [step.hide, false],
    ] as const) {
      for (const spec of specs) {
        const roots = matchedPaths(timeline.graph, spec.target);
        if (roots.length === 0) {
          diagnostics.push({ severity: 'error', message: `"${spec.target}" matches nothing`, step: step.name });
        }
        roots.forEach((root, index) => {
          const at = start + index * spec.stagger;
          for (const path of spec.exact ? [root] : withDescendants(timeline.graph, root)) {
            (timeline.visibility[path] ??= []).push({ at, visible, transition: spec.transition });
            if (visible) {
              revealed.add(path);
            }
          }
        });
      }
    }
  }
  timeline.hidden = [...revealed].sort();
  for (const events of Object.values(timeline.visibility)) {
    events.sort((a, b) => a.at - b.at);
  }
};

const compileProps = (timeline: Timeline, timed: TimedStep[], diagnostics: Diagnostic[]): void => {
  for (const { step, start } of timed) {
    for (const { selector, prop, value } of step.set) {
      const paths = matchedPaths(timeline.graph, selector);
      if (paths.length === 0) {
        diagnostics.push({ severity: 'error', message: `"${selector}" matches nothing`, step: step.name });
      }
      for (const path of paths) {
        timeline.props.push({ path, prop, value, at: start });
      }
    }
  }
  timeline.props.sort((a, b) => a.at - b.at);
};

const compileText = (timeline: Timeline, timed: TimedStep[]): void => {
  const ordered = [...timed].sort((a, b) => a.start - b.start);
  const captions = ordered.flatMap(({ step, start }) =>
    step.caption === undefined ? [] : [{ text: step.caption, start }],
  );
  timeline.captions = captions.map((caption, index) => ({
    ...caption,
    end: captions[index + 1]?.start ?? timeline.duration,
  }));
  timeline.marks = ordered.flatMap(({ step, start }) =>
    step.mark === undefined ? [] : [{ name: step.mark, at: start }],
  );
  timeline.narration = ordered.flatMap(({ step, start }) =>
    step.narration === undefined ? [] : [{ text: step.narration, at: start }],
  );
};

const findFlow = (source: string, options: CompileOptions, diagnostics: Diagnostic[]): FlowScript | undefined => {
  let blocks: MdlBlock[];
  try {
    blocks = parseMdl(source);
  } catch (error) {
    if (!(error instanceof MdlSyntaxError)) {
      throw error;
    }
    diagnostics.push({ severity: 'error', message: error.message, line: error.line });
    return undefined;
  }
  const block = blocks.find(
    (candidate) => candidate.type === 'flow' && (options.flow === undefined || candidate.id === options.flow),
  );
  if (!block) {
    diagnostics.push({
      severity: 'error',
      message: options.flow === undefined ? 'The source has no flow block' : `No flow "${options.flow}"`,
    });
    return undefined;
  }
  const read = readFlow(block);
  diagnostics.push(...read.diagnostics);
  return read.flow;
};

/** Compiles a flow against a template; never throws for authoring mistakes, which become diagnostics. */
export const compile = (source: string, template: NetworkTemplate, options: CompileOptions = {}): CompileResult => {
  const diagnostics: Diagnostic[] = [];
  const flow = findFlow(source, options, diagnostics);
  const seed = options.seed ?? flow?.seed ?? 0;
  let graph: Graph;
  try {
    graph = buildGraph(template, seed);
  } catch (error) {
    if (!(error instanceof TemplateError)) {
      throw error;
    }
    diagnostics.push({ severity: 'error', message: error.message });
    graph = emptyGraph();
  }
  const timeline = emptyTimeline(graph);
  if (!flow) {
    return { timeline, diagnostics };
  }
  const timed = schedule(flow.steps);
  timeline.duration = timed.reduce((max, { end }) => Math.max(max, end), 0);
  compileCamera(timeline, timed, diagnostics);
  compileVisibility(timeline, timed, diagnostics);
  compileProps(timeline, timed, diagnostics);
  compileText(timeline, timed);
  return { timeline, diagnostics };
};
```

`src/timeline/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './camera.ts';
export * from './compile.ts';
export * from './select.ts';
export * from './types.ts';
```

Add `export * from './timeline/index.ts';` to `src/index.ts`.

Note on the first `schedule` test: steps one (0–2s), two (with one, 0–1s), three (2–5s) and four (pinned at 10s, 10–11s) give a duration of 11s.

- [ ] **Step 4: Run the tests**

Run: `moon run animation:test -- src/timeline`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/common/animation
git commit -m "animation: compile flows into camera, visibility, property and text tracks"
```

---

### Task 8: Routes and packets

**Files:**

- Create: `packages/common/animation/src/timeline/route.ts`
- Create: `packages/common/animation/src/timeline/packets.ts`
- Test: `packages/common/animation/src/timeline/packets.test.ts`
- Modify: `packages/common/animation/src/timeline/compile.ts` (call `compilePackets`)
- Modify: `packages/common/animation/src/timeline/index.ts`

**Interfaces:**

- Consumes: `Graph`, `GraphNode`, `GraphNetwork`, `getNetwork`, `getNode`, `Vec2` (Task 4); `createRandom`, `Random` (Task 3); `at` (Task 3); `matchedPaths`, `withDescendants`, `TimedStep`, `Packet` (Task 7); `Diagnostic` (Task 6).
- Produces: `networkAdjacency(graph): Record<Path, Path[]>`, `findRoute(adjacency, from, to): Path[] | undefined`, `packetPath(graph, source, target, route): Vec2[]`, `PACKET_COLORS`, `compilePackets(graph, timed, duration, seed, diagnostics): Packet[]`.

- [ ] **Step 1: Write the failing test**

`src/timeline/packets.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type NetworkTemplate, buildGraph } from '../model/index.ts';

import { compile } from './compile.ts';
import { findRoute, networkAdjacency, packetPath } from './route.ts';

const TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'a',
      kind: 'devices',
      nodes: [
        { id: 'p1', type: 'phone' },
        { id: 'p2', type: 'phone' },
      ],
    },
    { id: 'b', kind: 'devices', nodes: [{ id: 'l1', type: 'laptop' }] },
    { id: 'c', kind: 'cloud', networks: [{ id: 'r', kind: 'servers', nodes: [{ id: 's1', type: 'server' }] }] },
    { id: 'island', kind: 'devices', nodes: [{ id: 'p', type: 'phone' }] },
  ],
  links: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ],
};

const flow = (...steps: string[]) => ['flow T-1', '  seed: 2', '  steps:', ...steps].join('\n');

describe('routes', () => {
  test('breadth-first over links and nesting', ({ expect }) => {
    const graph = buildGraph(TEMPLATE, 1);
    const adjacency = networkAdjacency(graph);
    expect(findRoute(adjacency, 'a', 'c/r')).toEqual(['a', 'b', 'c', 'c/r']);
    expect(findRoute(adjacency, 'a', 'a')).toEqual(['a']);
    expect(findRoute(adjacency, 'a', 'island')).toBeUndefined();
  });

  test('a packet path leaves through rims', ({ expect }) => {
    const graph = buildGraph(TEMPLATE, 1);
    const source = graph.nodes['a/p1'];
    const target = graph.nodes['c/r/s1'];
    if (!source || !target) {
      throw new Error('missing nodes');
    }
    const points = packetPath(graph, source, target, ['a', 'b', 'c', 'c/r']);
    expect(points[0]).toEqual(source.position);
    expect(points[points.length - 1]).toEqual(target.position);
    expect(points.length).toBe(2 + 2 + 2 + 1);
  });
});

describe('compilePackets', () => {
  test('send by count and rate', ({ expect }) => {
    const { timeline, diagnostics } = compile(
      flow(
        '    - name: s',
        '      send: [{ from: a/p1, to: b/l1, count: 3, speed: 1000 }, { from: a, to: "c/**", rate: 2/s, until: 2s }]',
        '      hold: 4s',
      ),
      TEMPLATE,
    );
    expect(diagnostics).toEqual([]);
    const counted = timeline.packets.filter((packet) => packet.id.startsWith('0.s0.'));
    expect(counted.map((packet) => packet.spawn)).toEqual([0, 1000, 2000]);
    expect(counted.every((packet) => packet.from === 'a/p1' && packet.to === 'b/l1')).toBe(true);
    const rated = timeline.packets.filter((packet) => packet.id.startsWith('0.s1.'));
    expect(rated.map((packet) => packet.spawn)).toEqual([0, 500, 1000, 1500]);
    expect(rated.every((packet) => packet.to === 'c/r/s1')).toBe(true);
    expect(timeline.maxTravel).toBeGreaterThan(0);
    const again = compile(
      flow(
        '    - name: s',
        '      send: [{ from: a/p1, to: b/l1, count: 3, speed: 1000 }, { from: a, to: "c/**", rate: 2/s, until: 2s }]',
        '      hold: 4s',
      ),
      TEMPLATE,
    );
    expect(again.timeline.packets).toEqual(timeline.packets);
  });

  test('traffic stays deterministic and reachable', ({ expect }) => {
    const { timeline } = compile(
      flow('    - name: t', '      traffic: { scope: "a, b", rate: 5/s }', '      hold: 2s'),
      TEMPLATE,
    );
    expect(timeline.packets.length).toBeGreaterThan(0);
    expect(timeline.packets.every((packet) => packet.from !== packet.to)).toBe(true);
  });

  test('unreachable targets warn once', ({ expect }) => {
    const { timeline, diagnostics } = compile(
      flow('    - name: s', '      send: { from: a/p1, to: island/p, count: 4 }', '      hold: 1s'),
      TEMPLATE,
    );
    expect(timeline.packets).toEqual([]);
    expect(diagnostics).toEqual([{ severity: 'warning', message: 'No route from "a/p1" to "island/p"', step: 's' }]);
  });

  test('selectors with no nodes are errors', ({ expect }) => {
    const { diagnostics } = compile(flow('    - name: s', '      send: { from: nowhere, to: b, count: 1 }'), TEMPLATE);
    expect(diagnostics).toEqual([{ severity: 'error', message: '"nowhere" matches no nodes', step: 's' }]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `moon run animation:test -- src/timeline/packets.test.ts`
Expected: FAIL, cannot resolve `./route.ts`.

- [ ] **Step 3: Write the implementation**

`src/timeline/route.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Graph, type GraphNetwork, type GraphNode, type Vec2, getNetwork } from '../model/index.ts';
import { type Path } from '../path.ts';
import { at } from '../util.ts';

/** Networks are adjacent through links and through nesting. */
export const networkAdjacency = (graph: Graph): Record<Path, Path[]> => {
  const adjacency: Record<Path, Path[]> = {};
  const add = (a: Path, b: Path): void => {
    (adjacency[a] ??= []).push(b);
    (adjacency[b] ??= []).push(a);
  };
  for (const link of graph.links) {
    add(link.from, link.to);
  }
  for (const network of Object.values(graph.networks)) {
    if (network.parent !== undefined) {
      add(network.path, network.parent);
    }
  }
  for (const list of Object.values(adjacency)) {
    list.sort();
  }
  return adjacency;
};

/** The shortest chain of networks from `from` to `to`, inclusive. */
export const findRoute = (adjacency: Record<Path, Path[]>, from: Path, to: Path): Path[] | undefined => {
  if (from === to) {
    return [from];
  }
  const previous = new Map<Path, Path>([[from, from]]);
  const queue = [from];
  for (let index = 0; index < queue.length; index++) {
    const current = at(queue, index);
    for (const next of adjacency[current] ?? []) {
      if (previous.has(next)) {
        continue;
      }
      previous.set(next, current);
      if (next === to) {
        const route = [to];
        for (let step = current; step !== from; step = previous.get(step) ?? from) {
          route.unshift(step);
        }
        route.unshift(from);
        return route;
      }
      queue.push(next);
    }
  }
  return undefined;
};

const rim = (network: GraphNetwork, toward: Vec2): Vec2 => {
  const dx = toward[0] - network.center[0];
  const dy = toward[1] - network.center[1];
  const distance = Math.hypot(dx, dy) || 1;
  return [network.center[0] + (dx / distance) * network.radius, network.center[1] + (dy / distance) * network.radius];
};

/** Node, out through each network's rim, across links (or into a child network), to the target node. */
export const packetPath = (graph: Graph, source: GraphNode, target: GraphNode, route: readonly Path[]): Vec2[] => {
  const points: Vec2[] = [source.position];
  for (let index = 0; index + 1 < route.length; index++) {
    const from = getNetwork(graph, at(route, index));
    const to = getNetwork(graph, at(route, index + 1));
    const last = at(points, points.length - 1);
    if (to.parent === from.path) {
      points.push(rim(to, last));
    } else if (from.parent === to.path) {
      points.push(rim(from, target.position));
    } else {
      points.push(rim(from, to.center), rim(to, from.center));
    }
  }
  points.push(target.position);
  return points;
};
```

`src/timeline/packets.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Graph, type GraphNode, getNetwork, getNode } from '../model/index.ts';
import { type Path } from '../path.ts';
import { type Random, createRandom } from '../random.ts';
import { type Diagnostic } from '../script/index.ts';
import { at } from '../util.ts';

import { findRoute, networkAdjacency, packetPath } from './route.ts';
import { matchedPaths, withDescendants } from './select.ts';
import { type Packet, type TimedStep } from './types.ts';

export const PACKET_COLORS = ['#5f8fae', '#c97c6b', '#6f9a8f', '#b8975c', '#8a7bb0'] as const;

const PEER_CHANCE = 0.35;
const MAX_HOPS = 3;

const nodesUnder = (graph: Graph, selector: string): Path[] => {
  const out = new Set<Path>();
  for (const path of matchedPaths(graph, selector)) {
    for (const candidate of withDescendants(graph, path)) {
      if (graph.nodes[candidate]) {
        out.add(candidate);
      }
    }
  }
  return [...out].sort();
};

const spawnTimes = (start: number, end: number, rate: number | undefined, count: number | undefined): number[] => {
  if (count !== undefined) {
    return Array.from({ length: count }, (_, index) => start + (index * 1000) / (rate ?? 1));
  }
  if (rate === undefined) {
    return [];
  }
  const times: number[] = [];
  for (let time = start; time < end; time += 1000 / rate) {
    times.push(time);
  }
  return times;
};

const makePacket = (
  graph: Graph,
  id: string,
  spawn: number,
  source: GraphNode,
  target: GraphNode,
  route: Path[],
  color: string,
  speed: number,
): Packet => {
  const points = packetPath(graph, source, target, route);
  const lengths = [0];
  for (let index = 1; index < points.length; index++) {
    const a = at(points, index - 1);
    const b = at(points, index);
    lengths.push(at(lengths, index - 1) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return {
    id,
    from: source.path,
    to: target.path,
    spawn,
    travel: (at(lengths, lengths.length - 1) / speed) * 1000,
    points,
    lengths,
    color,
  };
};

/** A destination for background traffic: a peer in the same network, or a node a few hops away. */
const wander = (
  graph: Graph,
  adjacency: Record<Path, Path[]>,
  source: GraphNode,
  random: Random,
): { node: GraphNode; route: Path[] } | undefined => {
  const home = getNetwork(graph, source.network);
  const peers = home.nodes.filter((path) => path !== source.path);
  if (peers.length > 0 && random.next() < PEER_CHANCE) {
    return { node: getNode(graph, random.pick(peers)), route: [home.path] };
  }
  const route = [home.path];
  const hops = random.int(1, MAX_HOPS);
  for (let hop = 0; hop < hops; hop++) {
    const options = (adjacency[at(route, route.length - 1)] ?? []).filter((path) => !route.includes(path));
    if (options.length === 0) {
      break;
    }
    route.push(random.pick(options));
  }
  while (route.length > 1 && getNetwork(graph, at(route, route.length - 1)).nodes.length === 0) {
    route.pop();
  }
  const choices = getNetwork(graph, at(route, route.length - 1)).nodes.filter((path) => path !== source.path);
  if (choices.length === 0) {
    return undefined;
  }
  return { node: getNode(graph, random.pick(choices)), route };
};

/** Every packet the flow emits, sorted by spawn time; each packet draws from its own random fork. */
export const compilePackets = (
  graph: Graph,
  timed: readonly TimedStep[],
  duration: number,
  seed: number,
  diagnostics: Diagnostic[],
): Packet[] => {
  const random = createRandom(seed).fork('packets');
  const adjacency = networkAdjacency(graph);
  const packets: Packet[] = [];
  for (const { step, index, start } of timed) {
    step.send.forEach((send, sendIndex) => {
      const sources = nodesUnder(graph, send.from);
      const targets = nodesUnder(graph, send.to);
      for (const [selector, nodes] of [
        [send.from, sources],
        [send.to, targets],
      ] as const) {
        if (nodes.length === 0) {
          diagnostics.push({ severity: 'error', message: `"${selector}" matches no nodes`, step: step.name });
        }
      }
      if (sources.length === 0 || targets.length === 0) {
        return;
      }
      const end = send.until !== undefined ? start + send.until : duration;
      let warned = false;
      spawnTimes(start, end, send.rate, send.count).forEach((spawn, k) => {
        const local = random.fork(`send:${index}:${sendIndex}:${k}`);
        const source = getNode(graph, local.pick(sources));
        const others = targets.filter((path) => path !== source.path);
        const target = getNode(graph, local.pick(others.length > 0 ? others : targets));
        const route = findRoute(adjacency, source.network, target.network);
        if (!route) {
          if (!warned) {
            diagnostics.push({
              severity: 'warning',
              message: `No route from "${source.path}" to "${target.path}"`,
              step: step.name,
            });
            warned = true;
          }
          return;
        }
        const color = send.color ?? local.pick(PACKET_COLORS);
        packets.push(makePacket(graph, `${index}.s${sendIndex}.${k}`, spawn, source, target, route, color, send.speed));
      });
    });
    step.traffic.forEach((traffic, trafficIndex) => {
      const scope = nodesUnder(graph, traffic.scope);
      if (scope.length === 0) {
        diagnostics.push({ severity: 'error', message: `"${traffic.scope}" matches no nodes`, step: step.name });
        return;
      }
      const end = traffic.until !== undefined ? start + traffic.until : duration;
      spawnTimes(start, end, traffic.rate, undefined).forEach((spawn, k) => {
        const local = random.fork(`traffic:${index}:${trafficIndex}:${k}`);
        const source = getNode(graph, local.pick(scope));
        const destination = wander(graph, adjacency, source, local);
        if (destination) {
          packets.push(
            makePacket(
              graph,
              `${index}.t${trafficIndex}.${k}`,
              spawn,
              source,
              destination.node,
              destination.route,
              local.pick(PACKET_COLORS),
              traffic.speed,
            ),
          );
        }
      });
    });
  }
  return packets.sort((a, b) => a.spawn - b.spawn || a.id.localeCompare(b.id));
};
```

In `src/timeline/compile.ts`, import `compilePackets` from `./packets.ts` and add before `return { timeline, diagnostics };` at the end of `compile`:

```ts
timeline.packets = compilePackets(graph, timed, timeline.duration, seed, diagnostics);
timeline.maxTravel = timeline.packets.reduce((max, packet) => Math.max(max, packet.travel), 0);
```

Append to `src/timeline/index.ts`:

```ts
export * from './packets.ts';
export * from './route.ts';
```

- [ ] **Step 4: Run the tests**

Run: `moon run animation:test -- src/timeline`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/common/animation
git commit -m "animation: packet routes through network rims and deterministic emitters"
```

---

### Task 9: `evaluate(timeline, t)`

**Files:**

- Create: `packages/common/animation/src/timeline/evaluate.ts`
- Test: `packages/common/animation/src/timeline/evaluate.test.ts`
- Modify: `packages/common/animation/src/timeline/index.ts`

**Interfaces:**

- Consumes: `Timeline`, `CameraPose`, `Packet` (Task 7), `ease`, `interpolatePose` (Task 7), `clamp`, `lerp`, `at` (Task 3), `PropValue`, `Vec2` (Task 4).
- Produces: `TRANSITION_MS = 600`, types `ItemState = { visible: number; props: Record<string, PropValue> }`, `PacketState = { id: string; position: Vec2; color: string }`, `SceneState = { t: number; camera: CameraPose; networks: Record<Path, ItemState>; nodes: Record<Path, ItemState>; packets: PacketState[]; caption?: string; mark?: string }`, `evaluate(timeline: Timeline, time: number): SceneState`.

- [ ] **Step 1: Write the failing test**

`src/timeline/evaluate.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type NetworkTemplate } from '../model/index.ts';

import { compile } from './compile.ts';
import { evaluate } from './evaluate.ts';

const TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'a',
      kind: 'devices',
      nodes: [
        { id: 'p1', type: 'phone' },
        { id: 'p2', type: 'phone' },
      ],
    },
    { id: 'b', kind: 'devices', nodes: [{ id: 'l1', type: 'laptop' }] },
  ],
  links: [{ from: 'a', to: 'b' }],
};

const SOURCE = [
  'flow T-1',
  '  seed: 1',
  '  steps:',
  '    - name: start',
  '      camera: { view: top, fit: "*", over: 0s }',
  '      caption: Hello',
  '      hold: 1s',
  '    - name: reveal',
  '      show: { target: b, transition: fade }',
  '      set: { a/p1.app: chat }',
  '      camera: { focus: a/p1, ease: linear, over: 2s }',
  '      send: { from: a/p1, to: b/l1, count: 1, speed: 1000 }',
  '      mark: Reveal',
].join('\n');

const { timeline } = compile(SOURCE, TEMPLATE);

describe('evaluate', () => {
  test('visibility fades and properties change', ({ expect }) => {
    expect(evaluate(timeline, 0).networks.b?.visible).toBe(0);
    expect(evaluate(timeline, 1300).networks.b?.visible).toBeCloseTo(0.5);
    expect(evaluate(timeline, 2000).nodes['b/l1']?.visible).toBe(1);
    expect(evaluate(timeline, 0).networks.a?.visible).toBe(1);
    expect(evaluate(timeline, 500).nodes['a/p1']?.props.app).toBeUndefined();
    expect(evaluate(timeline, 1000).nodes['a/p1']?.props.app).toBe('chat');
  });

  test('camera interpolates position and zoom', ({ expect }) => {
    const segment = timeline.camera[1];
    if (!segment) {
      throw new Error('missing segment');
    }
    const mid = evaluate(timeline, 2000).camera;
    expect(mid.center[0]).toBeCloseTo((segment.from.center[0] + segment.to.center[0]) / 2);
    expect(mid.extent).toBeCloseTo(Math.sqrt(segment.from.extent * segment.to.extent));
    expect(mid.tilt).toBe(0);
  });

  test('packets move along their path once both ends are visible', ({ expect }) => {
    const packet = timeline.packets[0];
    const start = timeline.graph.nodes['a/p1']?.position;
    const end = timeline.graph.nodes['b/l1']?.position;
    if (!packet || !start || !end) {
      throw new Error('missing packet');
    }
    expect(evaluate(timeline, 999).packets).toEqual([]);
    const early = evaluate(timeline, 1001).packets[0];
    expect(early && Math.hypot(early.position[0] - start[0], early.position[1] - start[1])).toBeLessThan(2);
    const late = evaluate(timeline, 1000 + packet.travel - 1).packets[0];
    expect(late && Math.hypot(late.position[0] - end[0], late.position[1] - end[1])).toBeLessThan(2);
    expect(evaluate(timeline, 1000 + packet.travel + 1).packets).toEqual([]);
  });

  test('captions, marks, clamping and purity', ({ expect }) => {
    expect(evaluate(timeline, 1500)).toMatchObject({ caption: 'Hello', mark: 'Reveal' });
    expect(evaluate(timeline, 500).mark).toBeUndefined();
    expect(evaluate(timeline, -5)).toEqual(evaluate(timeline, 0));
    expect(evaluate(timeline, 99_999).t).toBe(3000);
    const before = JSON.stringify(evaluate(timeline, 2000));
    evaluate(timeline, 2500);
    expect(JSON.stringify(evaluate(timeline, 2000))).toBe(before);
  });

  test('a flow of zero-length steps', ({ expect }) => {
    const { timeline: empty } = compile('flow Z\n  steps:\n    - name: only\n      caption: Hi', TEMPLATE);
    expect(empty.duration).toBe(0);
    expect(evaluate(empty, 0).caption).toBe('Hi');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `moon run animation:test -- src/timeline/evaluate.test.ts`
Expected: FAIL, cannot resolve `./evaluate.ts`.

- [ ] **Step 3: Write the implementation**

`src/timeline/evaluate.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type PropValue, type Vec2 } from '../model/index.ts';
import { type Path } from '../path.ts';
import { at, clamp, lerp } from '../util.ts';

import { ease, interpolatePose } from './camera.ts';
import { type CameraPose, type CameraSegment, type Packet, type Timeline } from './types.ts';

export const TRANSITION_MS = 600;

export type ItemState = { visible: number; props: Record<string, PropValue> };
export type PacketState = { id: string; position: Vec2; color: string };
export type SceneState = {
  t: number;
  camera: CameraPose;
  networks: Record<Path, ItemState>;
  nodes: Record<Path, ItemState>;
  packets: PacketState[];
  caption?: string;
  mark?: string;
};

const cameraAt = (timeline: Timeline, t: number): CameraPose => {
  let segment: CameraSegment | undefined;
  for (const candidate of timeline.camera) {
    if (candidate.start > t) {
      break;
    }
    segment = candidate;
  }
  if (!segment) {
    return timeline.initialCamera;
  }
  const span = segment.end - segment.start;
  const k = span > 0 ? clamp((t - segment.start) / span, 0, 1) : 1;
  return interpolatePose(segment.from, segment.to, ease(segment.ease, k));
};

const visibilityAt = (timeline: Timeline, hidden: ReadonlySet<Path>, path: Path, t: number): number => {
  const initial = hidden.has(path) ? 0 : 1;
  let from = initial;
  let target = initial;
  let since = 0;
  let animated = false;
  const valueAt = (time: number): number =>
    animated ? lerp(from, target, clamp((time - since) / TRANSITION_MS, 0, 1)) : target;
  for (const event of timeline.visibility[path] ?? []) {
    if (event.at > t) {
      break;
    }
    from = valueAt(event.at);
    target = event.visible ? 1 : 0;
    since = event.at;
    animated = event.transition !== 'none';
  }
  return valueAt(t);
};

const propsAt = (
  timeline: Timeline,
  path: Path,
  base: Record<string, PropValue>,
  t: number,
): Record<string, PropValue> => {
  const props = { ...base };
  for (const event of timeline.props) {
    if (event.at > t) {
      break;
    }
    if (event.path === path) {
      props[event.prop] = event.value;
    }
  }
  return props;
};

/** Index of the first packet spawned at or after `time`. */
const lowerBound = (packets: readonly Packet[], time: number): number => {
  let low = 0;
  let high = packets.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (at(packets, mid).spawn < time) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
};

const pointAlong = (packet: Packet, k: number): Vec2 => {
  const total = at(packet.lengths, packet.lengths.length - 1);
  const distance = k * total;
  for (let index = 1; index < packet.points.length; index++) {
    const end = at(packet.lengths, index);
    if (distance <= end) {
      const start = at(packet.lengths, index - 1);
      const local = end > start ? (distance - start) / (end - start) : 1;
      const a = at(packet.points, index - 1);
      const b = at(packet.points, index);
      return [lerp(a[0], b[0], local), lerp(a[1], b[1], local)];
    }
  }
  return at(packet.points, packet.points.length - 1);
};

/** The complete scene at `time` (clamped to the timeline); a pure function of its inputs. */
export const evaluate = (timeline: Timeline, time: number): SceneState => {
  const t = clamp(time, 0, timeline.duration);
  const hidden = new Set(timeline.hidden);
  const networks: Record<Path, ItemState> = {};
  for (const network of Object.values(timeline.graph.networks)) {
    networks[network.path] = {
      visible: visibilityAt(timeline, hidden, network.path, t),
      props: propsAt(timeline, network.path, network.props, t),
    };
  }
  const nodes: Record<Path, ItemState> = {};
  for (const node of Object.values(timeline.graph.nodes)) {
    nodes[node.path] = {
      visible: visibilityAt(timeline, hidden, node.path, t),
      props: propsAt(timeline, node.path, node.props, t),
    };
  }

  const packets: PacketState[] = [];
  for (let index = lowerBound(timeline.packets, t - timeline.maxTravel); index < timeline.packets.length; index++) {
    const packet = at(timeline.packets, index);
    if (packet.spawn > t) {
      break;
    }
    const elapsed = t - packet.spawn;
    if (packet.travel <= 0 || elapsed >= packet.travel) {
      continue;
    }
    if ((nodes[packet.from]?.visible ?? 0) === 0 || (nodes[packet.to]?.visible ?? 0) === 0) {
      continue;
    }
    packets.push({ id: packet.id, color: packet.color, position: pointAlong(packet, elapsed / packet.travel) });
  }

  const caption = timeline.captions.find(
    ({ start, end }) => start <= t && (t < end || (end === timeline.duration && t === end)),
  )?.text;
  let mark: string | undefined;
  for (const candidate of timeline.marks) {
    if (candidate.at > t) {
      break;
    }
    mark = candidate.name;
  }
  return { t, camera: cameraAt(timeline, t), networks, nodes, packets, caption, mark };
};
```

Append `export * from './evaluate.ts';` to `src/timeline/index.ts`.

- [ ] **Step 4: Run the tests**

Run: `moon run animation:test`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/common/animation
git commit -m "animation: evaluate a timeline at any time"
```

---

### Task 10: Centralized and Decentralized fixtures, build and lint

The two fixtures are the animations requested on 2026-10-14. Centralized: a laptop running an app, zooming out with the laptop held at the centre until the edge of a large server network shows, then out further with the cloud centred and a constellation around it. Decentralized: phone, then laptop, then their local network, then neighbouring networks, then a constellation linked to a cloud with nested layers. The decentralized flow runs exactly 3:00, which is the spec's long-script check.

**Files:**

- Create: `packages/common/animation/src/testing/fixtures.ts`
- Create: `packages/common/animation/src/testing/index.ts`
- Test: `packages/common/animation/src/testing/fixtures.test.ts`
- Modify: `packages/common/animation/package.json` (add the `./testing` export)

**Interfaces:**

- Consumes: everything above.
- Produces: `CENTRALIZED_TEMPLATE`, `CENTRALIZED_FLOW`, `DECENTRALIZED_TEMPLATE`, `DECENTRALIZED_FLOW` from `@dxos/animation/testing`.

- [ ] **Step 1: Write the failing test**

`src/testing/fixtures.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { compile, evaluate } from '../timeline/index.ts';

import { CENTRALIZED_FLOW, CENTRALIZED_TEMPLATE, DECENTRALIZED_FLOW, DECENTRALIZED_TEMPLATE } from './fixtures.ts';

describe('fixtures', () => {
  test('decentralized runs 3:00 without errors', ({ expect }) => {
    const { timeline, diagnostics } = compile(DECENTRALIZED_FLOW, DECENTRALIZED_TEMPLATE);
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(timeline.duration).toBe(180_000);
    expect(timeline.marks.map((mark) => mark.name)).toEqual(['Devices', 'Local networks', 'The cloud']);
    expect(evaluate(timeline, 5_000).nodes['home/phone']?.props.app).toBe('chat');
    expect(evaluate(timeline, 0).networks['local-1']?.visible).toBe(0);
    expect(evaluate(timeline, 60_000).networks['local-1']?.visible).toBe(1);
    expect(evaluate(timeline, 60_000).packets.length).toBeGreaterThan(0);
    expect(evaluate(timeline, 70_000).camera.tilt).toBe(0);
    expect(timeline.graph.networks['cloud/region-1/region-1']).toBeDefined();
  });

  test('centralized keeps the laptop centred while zooming out', ({ expect }) => {
    const { timeline, diagnostics } = compile(CENTRALIZED_FLOW, CENTRALIZED_TEMPLATE);
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const laptop = timeline.graph.nodes['office/laptop']?.position;
    if (!laptop) {
      throw new Error('missing laptop');
    }
    const closeUp = evaluate(timeline, 5_000).camera;
    const edge = evaluate(timeline, 20_000).camera;
    expect(closeUp.center).toEqual(laptop);
    expect(edge.center[0]).toBeCloseTo(laptop[0]);
    expect(edge.extent).toBeGreaterThan(closeUp.extent * 4);
    expect(evaluate(timeline, 20_000).networks['site-1']?.visible).toBe(0);
    expect(evaluate(timeline, timeline.duration).networks['site-1']?.visible).toBe(1);
    expect(
      timeline.graph.links
        .filter((link) => link.from.startsWith('site-') || link.to.startsWith('site-'))
        .every((link) => link.from === 'cloud' || link.to === 'cloud'),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `moon run animation:test -- src/testing`
Expected: FAIL, cannot resolve `./fixtures.ts`.

- [ ] **Step 3: Write the fixtures**

`src/testing/fixtures.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type NetworkSpec, type NetworkTemplate } from '../model/index.ts';

const sites = (count: number, near?: string): NetworkSpec[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `site-${index + 1}`,
    kind: 'devices',
    generate: { nodes: { type: index % 3 === 0 ? 'laptop' : 'phone', count: [1, 3] } },
    ...(near ? { layout: { near } } : {}),
  }));

const REGION: NetworkSpec = { id: 'region', kind: 'servers', generate: { nodes: { type: 'server', count: [2, 4] } } };

/** One laptop beside a large provider cloud, with a constellation of other users around it. */
export const CENTRALIZED_TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'cloud',
      kind: 'cloud',
      layout: { at: [0, 0] },
      generate: {
        nodes: { type: 'server', count: [10, 12] },
        networks: { template: 'region', count: [4, 5], depth: 3 },
      },
    },
    {
      id: 'office',
      kind: 'devices',
      layout: { near: 'cloud' },
      nodes: [{ id: 'laptop', type: 'laptop', props: { app: 'editor' } }],
    },
    ...sites(16),
  ],
  templates: { region: REGION },
  links: [{ rule: 'cloud', scope: '*', ratio: 1 }],
};

export const CENTRALIZED_FLOW = `flow C-1: Centralized
  seed: 11
  steps:
    - name: A laptop running an app
      camera: { view: iso, focus: office/laptop, zoom: 1.4, over: 0s }
      caption: A laptop running an app
      mark: Laptop
      hold: 10s
    - name: The edge of the provider's network
      camera: { view: top, focus: office/laptop, zoom: 0.18, over: 6s }
      send: { from: office/laptop, to: 'cloud/**', rate: 2/s }
      caption: Every change goes to the provider's servers
      mark: Provider
      hold: 14s
    - name: Everyone else
      show: { target: 'site-*', stagger: 120ms }
      camera: { fit: '*', over: 6s }
      traffic: { scope: '**', rate: 8/s }
      caption: and so does everyone else's
      mark: Constellation
      hold: 20s
`;

/** A phone and laptop in a home network, neighbouring local networks, and a layered cloud. */
export const DECENTRALIZED_TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'cloud',
      kind: 'cloud',
      layout: { at: [0, 0] },
      generate: { nodes: { type: 'server', count: [6, 8] }, networks: { template: 'region', count: [3, 3], depth: 2 } },
    },
    {
      id: 'home',
      kind: 'devices',
      layout: { near: 'cloud' },
      nodes: [
        { id: 'phone', type: 'phone' },
        { id: 'laptop', type: 'laptop' },
      ],
    },
    ...Array.from({ length: 4 }, (_, index): NetworkSpec => ({
      id: `local-${index + 1}`,
      kind: 'devices',
      layout: { near: 'home' },
      generate: { nodes: { type: index % 2 === 0 ? 'phone' : 'laptop', count: [1, 3] } },
    })),
    ...sites(10),
  ],
  templates: { region: REGION },
  links: [
    { rule: 'nearby', k: 2, scope: 'home, local-*, site-*' },
    { rule: 'cloud', scope: '*', ratio: 0.6 },
  ],
};

export const DECENTRALIZED_FLOW = `flow D-1: Decentralized
  seed: 7
  steps:
    - name: Phone
      camera: { view: iso, focus: home/phone, zoom: 2.5, over: 0s }
      set: { home/phone.app: chat, home/laptop.app: chat }
      caption: A message is typed on the phone
      mark: Devices
      hold: 8s
    - name: Laptop
      camera: { focus: home/laptop, zoom: 1.5, over: 3s }
      send: { from: home/phone, to: home/laptop, rate: 1/s }
      caption: It arrives on the laptop, directly
      hold: 10s
    - name: Local network
      show: { target: home, exact: true }
      camera: { fit: home, over: 2s }
      caption: Both belong to one local network
      hold: 8s
    - name: Neighbours
      show: { target: 'local-*', stagger: 300ms }
      camera: { fit: 'home, local-*', over: 4s }
      traffic: { scope: 'home, local-*', rate: 3/s }
      caption: Local networks talk to their neighbours
      mark: Local networks
      hold: 14s
    - name: Top view
      camera: { view: top, over: 3s }
      hold: 6s
    - name: The cloud
      show: [{ target: 'site-*', stagger: 100ms }, cloud]
      camera: { fit: '*', over: 6s }
      traffic: { scope: '**', rate: 8/s }
      caption: and to a cloud with layers of its own
      mark: The cloud
      hold: 20s
    - name: Inside the cloud
      camera: { path: [{ fit: cloud }, { focus: cloud/region-1, zoom: 0.8 }], over: 8s }
      hold: 50s
    - name: Back out
      camera: { fit: '*', over: 6s }
      hold: 64s
`;
```

Check the decentralized timing: 8 + 10 + 8 + 14 + 6 + 20 + 50 + 64 = 180 seconds. Every step's `hold` is at least its `over`.

`src/testing/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './fixtures.ts';
```

Add to `exports` in `package.json`:

```json
    "./testing": {
      "source": "./src/testing/index.ts",
      "types": "./dist/types/src/testing/index.d.ts",
      "import": "./dist/lib/testing.mjs"
    }
```

and set `vite.config.ts` to build both entries:

```ts
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    testing: 'src/testing/index.ts',
  },
  test: { node: true },
});
```

- [ ] **Step 4: Run all checks**

Run: `moon run animation:test animation:build animation:lint deus:test deus:build`
Expected: all PASS. If a fixture assertion fails because layout placed `office` or `home` differently, adjust the fixture's `zoom` or seed, not the library.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/common/animation
git commit -m "animation: centralized and decentralized fixtures"
```

---

## Self-review notes

- **Spec coverage:** every P1 element of the spec has a task. Model, expansion and path ids are Task 4. Layout and links are Task 5. Flow verbs and diagnostics are Task 6. Timing and the camera, visibility, property and text tracks are Task 7. Packets are Task 8. `evaluate` is Task 9. The 3:00 fixture is Task 10. The `flow` dialect and the cloudflare rename are Task 2. The parser is Task 1.
- **Deliberate gaps:**
  - `camera.follow` of a moving packet is P3: P1 treats `follow` like `focus` on a node.
  - Node property schemas live in the plugin's node type registry (P2): P1 validates only `app`.
- **Additions to the spec:**
  - `layout.near` and comma alternatives in selectors were added to express the two requested animations.
  - `show.exact` was added so a network's disc can appear without hiding its devices first.
  - The spec should note all three in its flow-language section.
