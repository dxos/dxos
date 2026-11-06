//
// Copyright 2026 DXOS.org
//

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { type BlockValue, type Entry, type Row, decodeBlock, patchBlock } from './codec.ts';
import { SOFTWARE_DIALECT, keyedFields, parseDialectHeader, resolveBlockSchemas } from './dialects.ts';
import { type SourceBlock, parseSourceBlocks } from './source.ts';
import { applyChanges } from './text.ts';
import { type BlockSchema } from './types.ts';

const fence = (...lines: string[]) => ['```mdl', ...lines, '```'].join('\n');

const SPEC = [
  '---',
  'id: org.example.spec',
  'extends: [org.dxos.spec.software]',
  '---',
  '',
  fence(
    'op Create: Creates a thing',
    '  desc: Makes one thing and returns it; the caller owns',
    '    the result and must close it.',
    '  input:',
    '    name: string        # shown in the list',
    '    count?: number      # defaults to one',
    '  output: Thing',
    '  requires: [Database, Clock]',
  ),
  '',
  fence(
    'feat abcde: Retention',
    '  Feeds drop entries older than their retention.',
    '',
    '  req fghij: Entries older than the retention are dropped.',
    '  req kmnpq: The retention is per feed.',
  ),
  '',
].join('\n');

const schemasOf = (text: string) =>
  resolveBlockSchemas(text, { dialects: [...parseDialectHeader(text).extends, SOFTWARE_DIALECT] });

const blocksOf = (text: string, schemas: ReadonlyMap<string, BlockSchema>) =>
  parseSourceBlocks(text, { keyed: (kind) => keyedFields(schemas.get(kind)) });

/** The spec with one block edited through its value, and that block read back. */
const edit = (text: string, index: number, change: (value: BlockValue) => BlockValue) => {
  const schemas = schemasOf(text);
  const block = blocksOf(text, schemas)[index];
  const schema = schemas.get(block.kind)!;
  const next = change(decodeBlock(text, block, schema));
  const out = applyChanges(text, patchBlock(text, block, schema, next));
  const reread = blocksOf(out, schemas)[index];
  return { out, next, reread: decodeBlock(out, reread, schema) };
};

/** Lines of `after` that are not in `before`, as a multiset difference: what an edit touched. */
const touched = (before: string, after: string) => {
  const pool = new Map<string, number>();
  before.split('\n').forEach((line) => pool.set(line, (pool.get(line) ?? 0) + 1));
  return after.split('\n').filter((line) => {
    const count = pool.get(line) ?? 0;
    pool.set(line, count - 1);
    return count <= 0;
  });
};

describe('decodeBlock', () => {
  test('reads prose, rows, lists, entries and the inline prose of a kind that takes it', ({ expect }) => {
    const schemas = schemasOf(SPEC);
    const [op, feat] = blocksOf(SPEC, schemas);
    expect(decodeBlock(SPEC, op, schemas.get('op')!)).toMatchObject({
      title: 'Creates a thing',
      fields: {
        desc: 'Makes one thing and returns it; the caller owns the result and must close it.',
        input: [
          { name: 'name', optional: false, value: 'string', note: 'shown in the list' },
          { name: 'count', optional: true, value: 'number', note: 'defaults to one' },
        ],
        output: 'Thing',
        requires: ['Database', 'Clock'],
      },
      raw: [],
    });
    expect(decodeBlock(SPEC, feat, schemas.get('feat')!)).toMatchObject({
      title: 'Retention',
      prose: 'Feeds drop entries older than their retention.',
      fields: {
        req: [
          { key: 'fghij', text: 'Entries older than the retention are dropped.' },
          { key: 'kmnpq', text: 'The retention is per feed.' },
        ],
      },
    });
  });
});

describe('patchBlock', () => {
  test('an unchanged value changes nothing', ({ expect }) => {
    const schemas = schemasOf(SPEC);
    for (const block of blocksOf(SPEC, schemas)) {
      const schema = schemas.get(block.kind)!;
      expect(patchBlock(SPEC, block, schema, decodeBlock(SPEC, block, schema))).toEqual([]);
    }
  });

  test('a changed row keeps its note in its column', ({ expect }) => {
    const { out } = edit(SPEC, 0, (value) => ({
      ...value,
      fields: {
        ...value.fields,
        input: (value.fields.input as Row[]).map((row, index) => (index === 0 ? { ...row, value: 'Name' } : row)),
      },
    }));
    expect(touched(SPEC, out)).toEqual(['    name: Name          # shown in the list']);
  });

  test('added prose fills the last line before a new one starts', ({ expect }) => {
    const { out, next, reread } = edit(SPEC, 0, (value) => ({
      ...value,
      fields: { ...value.fields, desc: `${value.fields.desc} Twice.` },
    }));
    expect(reread.fields.desc).toBe(next.fields.desc);
    expect(touched(SPEC, out)).toEqual(['    the result and must close it. Twice.']);
  });

  test('a field the block lacks is inserted in schema order', ({ expect }) => {
    const { out } = edit(SPEC, 0, (value) => ({ ...value, fields: { ...value.fields, key: 'org.example.create' } }));
    expect(out).toContain('op Create: Creates a thing\n  key: org.example.create\n  desc:');
  });

  test('an emptied optional field is removed', ({ expect }) => {
    const { out } = edit(SPEC, 0, (value) => ({ ...value, fields: { ...value.fields, requires: [] } }));
    expect(out).not.toContain('requires');
    expect(out).toContain('  output: Thing\n```');
  });

  test('a flow list keeps its brackets', ({ expect }) => {
    const { out } = edit(SPEC, 0, (value) => ({
      ...value,
      fields: { ...value.fields, requires: [...(value.fields.requires as string[]), 'Log'] },
    }));
    expect(touched(SPEC, out)).toEqual(['  requires: [Database, Clock, Log]']);
  });

  test('entries are edited, added, removed and reordered by key', ({ expect }) => {
    const entries = (value: BlockValue) => value.fields.req as Entry[];
    const reordered = edit(SPEC, 1, (value) => ({
      ...value,
      fields: { ...value.fields, req: [...entries(value)].reverse() },
    }));
    expect(reordered.reread.fields.req).toEqual(reordered.next.fields.req);
    expect(reordered.out).toContain('  req kmnpq: The retention is per feed.\n  req fghij:');

    const added = edit(SPEC, 1, (value) => ({
      ...value,
      fields: {
        ...value.fields,
        req: [...entries(value).slice(1), { key: 'rstuv', text: 'Retention is a duration.' }],
      },
    }));
    expect(added.reread.fields.req).toEqual(added.next.fields.req);
    expect(added.out).not.toContain('fghij');
  });

  test('the title and inline prose are rewritten in place', ({ expect }) => {
    const { out } = edit(SPEC, 1, (value) => ({
      ...value,
      title: 'Feed retention',
      prose: 'Feeds forget old entries.',
    }));
    expect(touched(SPEC, out)).toEqual(['feat abcde: Feed retention', '  Feeds forget old entries.']);
  });
});

//
// Every block of every spec in the repository: an unchanged value is a no-op, and an edit reads back
// as made while touching only its own lines.
//

const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const corpus = execSync("git ls-files '*.mdl'", { cwd: root, encoding: 'utf8' })
  .trim()
  .split('\n')
  .map((path) => ({ path, text: readFileSync(join(root, path), 'utf8') }));

const eachBlock = (visit: (text: string, block: SourceBlock, schema: BlockSchema, index: number) => void) => {
  for (const { text } of corpus) {
    const schemas = schemasOf(text);
    blocksOf(text, schemas).forEach((block, index) => {
      const schema = schemas.get(block.kind);
      if (schema) {
        visit(text, block, schema, index);
      }
    });
  }
};

describe('patchBlock over the repository', () => {
  test('an unchanged value changes nothing', ({ expect }) => {
    let blocks = 0;
    const failures: string[] = [];
    eachBlock((text, block, schema) => {
      blocks++;
      if (patchBlock(text, block, schema, decodeBlock(text, block, schema)).length > 0) {
        failures.push(text.slice(block.from, block.to));
      }
    });
    expect(blocks).toBeGreaterThan(4_000);
    expect(failures.slice(0, 3)).toEqual([]);
  });

  test('a prose edit reads back and touches only its own lines', ({ expect }) => {
    let edits = 0;
    const failures: string[] = [];
    eachBlock((text, block, schema, index) => {
      const value = decodeBlock(text, block, schema);
      const name = schema.fields.find(
        (field) => field.type.kind === 'prose' && !value.raw.includes(field.name) && value.fields[field.name],
      )?.name;
      if (!name) {
        return;
      }
      edits++;
      const { out, next, reread } = edit(text, index, (current) => ({
        ...current,
        fields: { ...current.fields, [name]: `${current.fields[name]} Edited in the form.` },
      }));
      const lines = touched(text, out);
      if (reread.fields[name] !== next.fields[name] || lines.length > 3) {
        failures.push(`${name}: ${text.slice(block.from, block.to)}\n---\n${lines.join('\n')}`);
      }
    });
    expect(edits).toBeGreaterThan(2_000);
    expect(failures.slice(0, 3)).toEqual([]);
  });

  test('a row edit and an appended row touch one line each', ({ expect }) => {
    let edits = 0;
    const failures: string[] = [];
    eachBlock((text, block, schema, index) => {
      const value = decodeBlock(text, block, schema);
      const name = schema.fields.find(
        (field) =>
          field.type.kind === 'map' && !value.raw.includes(field.name) && (value.fields[field.name] as Row[])?.length,
      )?.name;
      if (!name) {
        return;
      }
      edits++;
      for (const change of [
        (rows: Row[]) => rows.map((row, i) => (i === 0 && row.value ? { ...row, value: `${row.value} | null` } : row)),
        (rows: Row[]) => [...rows, { name: 'added', optional: true, value: 'string' }],
      ]) {
        const { out, next, reread } = edit(text, index, (current) => ({
          ...current,
          fields: { ...current.fields, [name]: change(current.fields[name] as Row[]) },
        }));
        if (
          JSON.stringify(reread.fields[name]) !== JSON.stringify(next.fields[name]) ||
          touched(text, out).length > 1
        ) {
          failures.push(`${name}: ${text.slice(block.from, block.to)}\n---\n${touched(text, out).join('\n')}`);
        }
      }
    });
    expect(edits).toBeGreaterThan(1_000);
    expect(failures.slice(0, 3)).toEqual([]);
  });

  test('an entry edit reads back and touches only its own lines', ({ expect }) => {
    let edits = 0;
    const failures: string[] = [];
    eachBlock((text, block, schema, index) => {
      const value = decodeBlock(text, block, schema);
      const name = schema.fields.find(
        (field) => field.type.kind === 'keyed' && (value.fields[field.name] as Entry[])?.length,
      )?.name;
      if (!name) {
        return;
      }
      edits++;
      const { out, next, reread } = edit(text, index, (current) => ({
        ...current,
        fields: {
          ...current.fields,
          [name]: (current.fields[name] as Entry[]).map((entry, i) =>
            i === 0 ? { ...entry, text: `${entry.text} Edited.` } : entry,
          ),
        },
      }));
      if (JSON.stringify(reread.fields[name]) !== JSON.stringify(next.fields[name]) || touched(text, out).length > 3) {
        failures.push(`${name}: ${text.slice(block.from, block.to)}\n---\n${touched(text, out).join('\n')}`);
      }
    });
    expect(edits).toBeGreaterThan(500);
    expect(failures.slice(0, 3)).toEqual([]);
  });
});
