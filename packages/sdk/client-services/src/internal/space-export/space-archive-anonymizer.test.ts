//
// Copyright 2026 DXOS.org
//

import * as Automerge from '@automerge/automerge';
import { describe, test } from 'vitest';

import { type FeedArchiveBlock, SpaceArchiveFileStructure } from '@dxos/protocols';

import { Anonymizer, anonymizeSpaceArchiveFiles, classifyString, scanForSecrets } from './space-archive-anonymizer.ts';

const OBJECT_ID = '01M11GCSTZMXYN23VCZ1RJ3FMR';
const OTHER_ID = '01M11GCSTFRA833E6Y679NV3PF';
const SPACE_ID = 'BPBG3HN4O2XTMB5MRDZQXJBAXA7LAH4IA';
// Assembled at runtime so push protection does not read the fixtures as leaked credentials.
const FAKE_GITHUB_TOKEN = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
const FAKE_ANTHROPIC_KEY = ['sk', 'ant', 'api03', 'abcdefghijklmnop'].join('-');

type TestObject = {
  system: Record<string, unknown>;
  meta: { keys: { source: string; id: string }[]; tags: unknown[] };
  data: {
    title: string;
    owner: string;
    email: string;
    status: string;
    number: number;
    ratio: number;
    url: string;
    createdAt: string;
    description: string;
    token: Automerge.ImmutableString;
    views: Automerge.Counter;
    subtasks: { '/': string }[];
    layout: Record<string, { id: string; x: number }>;
  };
};

type TestDocument = {
  version: number;
  access: { spaceId: string; spaceKey: string };
  objects: Record<string, TestObject>;
};

const makeDocument = () =>
  Automerge.from<TestDocument>({
    version: 1,
    access: { spaceId: SPACE_ID, spaceKey: 'ab'.repeat(32) },
    objects: {
      [OBJECT_ID]: {
        system: { kind: 'object', type: { '/': 'dxn:org.dxos.type.task:0.6.0' }, parent: { '/': `echo:/${OTHER_ID}` } },
        meta: { keys: [{ source: 'linear.app/acme', id: '1234567' }], tags: [] },
        data: {
          title: 'Fix the login flow',
          owner: 'alice',
          email: 'alice@example.com',
          status: 'in-progress',
          number: 4321,
          ratio: 0.25,
          url: 'https://github.com/acme/widgets/pull/4321',
          createdAt: '2026-01-02T03:04:05.000Z',
          description: '# Notes\n\nAlice asked Bob to fix the *login* flow before Friday.',
          token: new Automerge.ImmutableString(FAKE_GITHUB_TOKEN),
          views: new Automerge.Counter(17),
          subtasks: [{ '/': `echo:/${OTHER_ID}` }],
          layout: { 'shape:abc123xyz': { id: 'shape:abc123xyz', x: 12.5 } },
        },
      },
    },
  });

describe('Anonymizer', () => {
  test('maps equal strings to equal replacements', ({ expect }) => {
    const anonymizer = new Anonymizer({ seed: 7 });
    const first = anonymizer.string('alice');
    expect(first).not.toBe('alice');
    expect(first).toHaveLength(5);
    expect(anonymizer.string('alice')).toBe(first);
    expect(new Anonymizer({ seed: 7 }).string('alice')).toBe(first);
    expect(new Anonymizer({ seed: 8 }).string('alice')).not.toBe(first);
  });

  test('splits prose into words and keeps punctuation and whitespace', ({ expect }) => {
    const anonymizer = new Anonymizer();
    const text = '## Plan\n\n- Alice meets Bob, then Alice leaves.';
    const result = anonymizer.string(text);
    expect(classifyString(text)).toBe('prose');
    expect(result.replace(/[\p{L}\p{N}]/gu, 'x')).toBe(text.replace(/[\p{L}\p{N}]/gu, 'x'));
    const words = result.match(/\p{L}+/gu) ?? [];
    expect(words[1]).toBe(words[5]);
    expect(words[1]).toMatch(/^[A-Z][a-z]{4}$/);
    expect(result).not.toContain('Alice');
  });

  test('keeps email and url shape', ({ expect }) => {
    const anonymizer = new Anonymizer();
    expect(anonymizer.string('alice@example.com')).toMatch(/^[a-z]{5}@[a-z]{7}\.com$/);
    expect(anonymizer.string('https://github.com/acme/widgets')).toMatch(/^https:\/\/github\.com\/[a-z]{4}\/[a-z]{7}$/);
  });

  test('replaces numbers keeping sign, integer-ness and digit count', ({ expect }) => {
    const anonymizer = new Anonymizer();
    const integer = anonymizer.number(-4321);
    expect(Number.isInteger(integer)).toBe(true);
    expect(integer).toBeLessThan(0);
    expect(String(-integer)).toHaveLength(4);
    expect(anonymizer.string('pull/4321')).toBe(`${anonymizer.string('pull')}/${-integer}`);
    const float = anonymizer.number(0.25);
    expect(Number.isInteger(float)).toBe(false);
    expect(float).toBeGreaterThan(0);
    expect(float).toBeLessThan(1);
    expect(anonymizer.number(0)).toBe(0);
    expect(anonymizer.number(1792987959337)).toBe(1792987959337);
  });

  test('keeps structural strings', ({ expect }) => {
    for (const value of [
      'dxn:org.dxos.type.task:0.6.0',
      `echo://${SPACE_ID}/${OBJECT_ID}`,
      'automerge:znvytAQpqXBtnqJZFmHG6uD2btT',
      OBJECT_ID,
      SPACE_ID,
      '2026-01-02T03:04:05.000Z',
      'org.dxos.skill.assistant',
    ]) {
      expect(classifyString(value)).toBe('structural');
      expect(new Anonymizer().string(value)).toBe(value);
    }
  });

  test('preserves document structure and Automerge types', ({ expect }) => {
    const anonymizer = new Anonymizer();
    const bytes = anonymizer.documentBytes('doc1', Automerge.save(makeDocument()));
    const source = makeDocument();
    const result = Automerge.load<TestDocument>(bytes);
    const object = result.objects[OBJECT_ID];
    const original = source.objects;

    expect(result.access).toEqual(source.access);
    expect(object.system).toEqual(original[OBJECT_ID].system);
    expect(object.meta.keys[0].source).toMatch(/^[a-z]{6}\.app\/[a-z]{4}$/);
    expect(object.meta.keys[0].id).toMatch(/^[1-9]\d{6}$/);
    expect(Object.keys(object.data)).toEqual(Object.keys(original[OBJECT_ID].data));
    expect(object.data.status).toBe('in-progress');
    expect(object.data.createdAt).toBe('2026-01-02T03:04:05.000Z');
    expect(object.data.subtasks).toEqual([{ '/': `echo:/${OTHER_ID}` }]);
    expect(object.data.layout['shape:abc123xyz'].id).toBe('shape:abc123xyz');
    expect(object.data.title).not.toBe('Fix the login flow');
    expect(object.data.title).toHaveLength('Fix the login flow'.length);
    expect(object.data.token).toBeInstanceOf(Automerge.ImmutableString);
    expect(String(object.data.token)).not.toContain('abcdefgh');
    expect(object.data.views).toBeInstanceOf(Automerge.Counter);
    expect(object.data.url).toBe(`https://github.com/${anonymizer.string('acme/widgets/pull')}/${object.data.number}`);
    expect(JSON.stringify(result)).not.toMatch(/alice|login|Friday/i);
  });

  test('anonymizes feed blocks and keeps their metadata', ({ expect }) => {
    const anonymizer = new Anonymizer();
    const object = {
      'id': OBJECT_ID,
      '@type': 'dxn:org.dxos.type.message:0.1.0',
      '@uri': `echo://${SPACE_ID}/${OBJECT_ID}`,
      '@meta': { keys: [] },
      'sender': { role: 'user', name: 'Alice' },
      'blocks': [{ _tag: 'text', text: `Hello Alice, the key is ${FAKE_ANTHROPIC_KEY}` }],
    };
    const block: FeedArchiveBlock = {
      actorId: '008be4a3-01b5-42be-a4ca-b73765d1be7e',
      sequence: 3,
      prevActorId: null,
      prevSequence: null,
      position: 3,
      timestamp: 1787830888320,
      data: Buffer.from(JSON.stringify(object)).toString('base64'),
    };
    const result = anonymizer.feedBlock(block);
    const decoded = JSON.parse(Buffer.from(result.data, 'base64').toString());
    expect({ ...result, data: undefined }).toEqual({ ...block, data: undefined });
    expect(decoded.id).toBe(object.id);
    expect(decoded['@type']).toBe(object['@type']);
    expect(decoded['@uri']).toBe(object['@uri']);
    expect(decoded.sender.role).toBe('user');
    expect(decoded.sender.name).toBe(anonymizer.string('Alice'));
    expect(decoded.blocks[0]._tag).toBe('text');
    expect(scanForSecrets(JSON.stringify(object)).map(({ pattern }) => pattern)).toContain('anthropicKey');
    expect(scanForSecrets(decoded.blocks[0].text)).toEqual([]);
  });

  test('anonymizes archive files and reports no residue', ({ expect }) => {
    const anonymizer = new Anonymizer();
    const encoder = new TextEncoder();
    const files = [
      {
        path: SpaceArchiveFileStructure.metadata,
        content: encoder.encode(JSON.stringify({ version: 1, echo: { currentRootUrl: 'automerge:doc1' } })),
      },
      { path: `${SpaceArchiveFileStructure.documents}/doc1.bin`, content: Automerge.save(makeDocument()) },
      { path: 'stray.txt', content: encoder.encode('private') },
    ];
    const result = anonymizeSpaceArchiveFiles(anonymizer, files);
    expect(result.map(({ path }) => path)).toEqual(files.slice(0, 2).map(({ path }) => path));
    const text = JSON.stringify(Automerge.toJS(Automerge.load(result[1].content)));
    const residue = [...anonymizer.replacedTokens()].filter((token) => text.includes(token));
    expect(residue).toEqual([]);
  });
});
