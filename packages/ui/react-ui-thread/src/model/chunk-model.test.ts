//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import {
  type Chunk,
  type ChunkDocument,
  type ChunkDocumentChange,
  ChunkModel,
  type ChunkRenderer,
  diffText,
} from './chunk-model';

type Line = Chunk & { text: string };

const render: ChunkRenderer<Line> = (chunk) => `${chunk.text}\n`;

/** Applies changes to a string, so a test asserts on the document a real host would hold. */
class TestDocument implements ChunkDocument {
  text = '';
  readonly changes: ChunkDocumentChange[] = [];

  apply(change: ChunkDocumentChange): void {
    this.changes.push(change);
    this.text =
      change.type === 'append'
        ? this.text + change.text
        : this.text.slice(0, change.from) + change.text + this.text.slice(change.to);
  }

  /** The changes since the last call, so each step asserts only on what it caused. */
  drain(): ChunkDocumentChange[] {
    return this.changes.splice(0, this.changes.length);
  }
}

const line = (id: string, text = id): Line => ({ id, text });

const sync = (model: ChunkModel<Line>, document: TestDocument, chunks: Line[]) => {
  model.set(chunks).sync(document);
  return document.drain();
};

describe('diffText', () => {
  test('no change', () => {
    expect(diffText('abc', 'abc')).toBeUndefined();
  });

  test('extension is an append', () => {
    expect(diffText('abc', 'abcdef')).toEqual({ type: 'append', text: 'def' });
  });

  test('empty to non-empty is an append', () => {
    expect(diffText('', 'abc')).toEqual({ type: 'append', text: 'abc' });
  });

  test('replaces only the span between the common prefix and suffix', () => {
    expect(diffText('abcXYZdef', 'abcQdef')).toEqual({ type: 'replace', from: 3, to: 6, text: 'Q' });
  });

  test('deletion at the tail', () => {
    expect(diffText('abcdef', 'abc')).toEqual({ type: 'replace', from: 3, to: 6, text: '' });
  });

  test('prefix and suffix never overlap', () => {
    // 'aa' -> 'aaa': the naive suffix scan would claim both 'a's the prefix already claimed.
    const change = diffText('aa', 'aaa');
    expect(change).toEqual({ type: 'append', text: 'a' });
  });

  test('insertion between two runs of the same character', () => {
    expect(diffText('aaaa', 'aaXaa')).toEqual({ type: 'replace', from: 2, to: 2, text: 'X' });
  });
});

describe('ChunkModel', () => {
  test('renders chunks in order', () => {
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a'), line('b')]);
    expect(document.text).toBe('a\nb\n');
  });

  test('appending reports an append, so a streaming host can animate it', () => {
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a')]);
    const changes = sync(model, document, [line('a'), line('b')]);
    expect(changes).toEqual([{ type: 'append', text: 'b\n' }]);
    expect(document.text).toBe('a\nb\n');
  });

  test('a streaming chunk grows by append, then closes with its separator', () => {
    // Why plugin-assistant's renderer withholds the trailing newline while a block is pending:
    // with the separator already written, growth is no longer an extension of the document and
    // the typewriter would see a replace instead of an append.
    type Streaming = Line & { pending?: boolean };
    const model = new ChunkModel<Streaming>((chunk) => (chunk.pending ? chunk.text : `${chunk.text}\n`));
    const document = new TestDocument();
    model.set([{ id: 'a', text: 'hel', pending: true }]).sync(document);
    expect(document.drain()).toEqual([{ type: 'append', text: 'hel' }]);

    model.set([{ id: 'a', text: 'hello', pending: true }]).sync(document);
    expect(document.drain()).toEqual([{ type: 'append', text: 'lo' }]);

    model.set([{ id: 'a', text: 'hello' }]).sync(document);
    expect(document.drain()).toEqual([{ type: 'append', text: '\n' }]);
    expect(document.text).toBe('hello\n');
  });

  test('inserting in the middle touches only the inserted span', () => {
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a'), line('c')]);
    const changes = sync(model, document, [line('a'), line('b'), line('c')]);
    expect(changes).toEqual([{ type: 'replace', from: 2, to: 2, text: 'b\n' }]);
    expect(document.text).toBe('a\nb\nc\n');
  });

  test('editing in place touches only that chunk', () => {
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a'), line('b'), line('c')]);
    const changes = sync(model, document, [line('a'), line('b', 'edited'), line('c')]);
    expect(document.text).toBe('a\nedited\nc\n');
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('replace');
  });

  test('deleting from the middle', () => {
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a'), line('b'), line('c')]);
    sync(model, document, [line('a'), line('c')]);
    expect(document.text).toBe('a\nc\n');
  });

  test('a delete and an edit in one pass land on the right lines', () => {
    // The batch case TranscriptModel gets wrong: it replays each change against line counts from
    // the previous sync, so the second lands at an offset the first has already invalidated.
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a'), line('b'), line('c'), line('d')]);
    sync(model, document, [line('a'), line('c', 'edited'), line('d')]);
    expect(document.text).toBe('a\nedited\nd\n');
  });

  test('several sets before a sync collapse into one change', () => {
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a')]);
    model.set([line('a'), line('b')]);
    model.set([line('a'), line('b'), line('c')]);
    model.sync(document);
    expect(document.drain()).toEqual([{ type: 'append', text: 'b\nc\n' }]);
    expect(document.text).toBe('a\nb\nc\n');
  });

  test('a no-op set writes nothing', () => {
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a')]);
    expect(sync(model, document, [line('a')])).toEqual([]);
  });

  test('replacing every chunk rewrites the document', () => {
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a'), line('b')]);
    sync(model, document, [line('x'), line('y')]);
    expect(document.text).toBe('x\ny\n');
  });

  test('reset rewrites the document from empty', () => {
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a'), line('b')]);
    model.reset().sync(document);
    expect(document.text).toBe('');
    sync(model, document, [line('c')]);
    expect(document.text).toBe('c\n');
  });

  test('ranges address each chunk within the document', () => {
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a', 'one'), line('b', 'two')]);
    expect(model.getRanges()).toEqual([
      { id: 'a', from: 0, to: 4 },
      { id: 'b', from: 4, to: 8 },
    ]);
    expect(document.text.slice(0, 4)).toBe('one\n');
    expect(document.text.slice(4, 8)).toBe('two\n');
  });

  test('ranges follow an insertion', () => {
    const model = new ChunkModel(render);
    const document = new TestDocument();
    sync(model, document, [line('a'), line('c')]);
    sync(model, document, [line('a'), line('b'), line('c')]);
    expect(model.getRanges()).toEqual([
      { id: 'a', from: 0, to: 2 },
      { id: 'b', from: 2, to: 4 },
      { id: 'c', from: 4, to: 6 },
    ]);
  });
});

describe('ChunkModel render caching', () => {
  const countingRenderer = () => {
    const calls: string[] = [];
    const renderer: ChunkRenderer<Line> = (chunk) => {
      calls.push(chunk.id);
      return `${chunk.text}\n`;
    };
    return { calls, renderer };
  };

  test('without getRevision every chunk re-renders', () => {
    const { calls, renderer } = countingRenderer();
    const model = new ChunkModel(renderer);
    const document = new TestDocument();
    sync(model, document, [line('a'), line('b')]);
    calls.length = 0;
    sync(model, document, [line('a'), line('b'), line('c')]);
    expect(calls).toEqual(['a', 'b', 'c']);
  });

  test('an unchanged revision reuses the cached rendering', () => {
    // What makes an impure renderer safe: plugin-assistant folds a toolResult block into widget
    // state by appending to it, so rendering a finalized block twice would duplicate the entry.
    const { calls, renderer } = countingRenderer();
    const model = new ChunkModel(renderer, { getRevision: (chunk) => chunk.text });
    const document = new TestDocument();
    sync(model, document, [line('a'), line('b')]);
    calls.length = 0;
    sync(model, document, [line('a'), line('b'), line('c')]);
    expect(calls).toEqual(['c']);
  });

  test('a changed revision re-renders that chunk only', () => {
    const { calls, renderer } = countingRenderer();
    const model = new ChunkModel(renderer, { getRevision: (chunk) => chunk.text });
    const document = new TestDocument();
    sync(model, document, [line('a'), line('b')]);
    calls.length = 0;
    sync(model, document, [line('a'), line('b', 'edited')]);
    expect(calls).toEqual(['b']);
    expect(document.text).toBe('a\nedited\n');
  });

  test('a chunk that keeps its revision but moves is re-rendered', () => {
    // The renderer takes the index, so a cached rendering is only valid at the index it was made.
    const calls: Array<[string, number]> = [];
    const renderer: ChunkRenderer<Line> = (chunk, index) => {
      calls.push([chunk.id, index]);
      return `${index}:${chunk.text}\n`;
    };
    const model = new ChunkModel(renderer, { getRevision: (chunk) => chunk.text });
    const document = new TestDocument();
    sync(model, document, [line('a'), line('b')]);
    calls.length = 0;
    sync(model, document, [line('x'), line('a'), line('b')]);
    expect(calls).toEqual([
      ['x', 0],
      ['a', 1],
      ['b', 2],
    ]);
    expect(document.text).toBe('0:x\n1:a\n2:b\n');
  });

  test('a removed chunk drops out of the cache', () => {
    const { calls, renderer } = countingRenderer();
    const model = new ChunkModel(renderer, { getRevision: (chunk) => chunk.text });
    const document = new TestDocument();
    sync(model, document, [line('a'), line('b')]);
    sync(model, document, [line('a')]);
    calls.length = 0;
    sync(model, document, [line('a'), line('b')]);
    expect(calls).toEqual(['b']);
  });
});
