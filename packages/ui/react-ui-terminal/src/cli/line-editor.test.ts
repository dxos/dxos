//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import { describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { type LineResult, readLineResult } from './line-editor';
import { TestBridge } from './testing';

/**
 * Starts a read, feeds the given data, and resolves with the result. The read subscribes
 * synchronously up to its first suspension, so the data is delivered to a live subscriber.
 */
const readWith = async (
  data: string,
  options?: { prompt?: string; history?: string[] },
): Promise<{ bridge: TestBridge; result: LineResult }> => {
  const bridge = new TestBridge();
  const fiber = Effect.runFork(readLineResult(bridge, options));
  bridge.send(data);
  return { bridge, result: await EffectEx.runPromise(Fiber.join(fiber)) };
};

describe('readLineResult', () => {
  test('returns the typed line on return', async () => {
    const { result } = await readWith('space list\r');
    expect(result).to.deep.eq({ type: 'line', value: 'space list' });
  });

  test('returns an empty line for a bare return', async () => {
    const { result } = await readWith('\r');
    expect(result).to.deep.eq({ type: 'line', value: '' });
  });

  test('backspace removes the previous character', async () => {
    const { result } = await readWith('lists\x7f\r');
    expect(result).to.deep.eq({ type: 'line', value: 'list' });
  });

  test('backspace at the start is a no-op', async () => {
    const { result } = await readWith('\x7f\x7fok\r');
    expect(result).to.deep.eq({ type: 'line', value: 'ok' });
  });

  test('left arrow moves the insertion point', async () => {
    const { result } = await readWith('ac\x1b[Db\r');
    expect(result).to.deep.eq({ type: 'line', value: 'abc' });
  });

  test('right arrow moves back toward the end', async () => {
    const { result } = await readWith('ac\x1b[D\x1b[Cd\r');
    expect(result).to.deep.eq({ type: 'line', value: 'acd' });
  });

  test('delete removes the character under the cursor', async () => {
    const { result } = await readWith('abc\x1b[D\x1b[3~\r');
    expect(result).to.deep.eq({ type: 'line', value: 'ab' });
  });

  test('home and end jump to the buffer edges', async () => {
    const { result } = await readWith('bc\x1b[Ha\x1b[Fd\r');
    expect(result).to.deep.eq({ type: 'line', value: 'abcd' });
  });

  test('ctrl-a and ctrl-e jump to the buffer edges', async () => {
    const { result } = await readWith('bc\x01a\x05d\r');
    expect(result).to.deep.eq({ type: 'line', value: 'abcd' });
  });

  test('ctrl-u clears to the start and ctrl-k clears to the end', async () => {
    expect((await readWith('drop\x15keep\r')).result).to.deep.eq({ type: 'line', value: 'keep' });
    expect((await readWith('keep\x1b[D\x0b\r')).result).to.deep.eq({ type: 'line', value: 'kee' });
  });

  test('ctrl-c cancels without returning a line', async () => {
    const { result } = await readWith('half typed\x03');
    expect(result).to.deep.eq({ type: 'cancelled' });
  });

  test('ctrl-d on an empty buffer signals end of input', async () => {
    const { result } = await readWith('\x04');
    expect(result).to.deep.eq({ type: 'eof' });
  });

  test('ctrl-d with content is ignored', async () => {
    const { result } = await readWith('keep\x04\r');
    expect(result).to.deep.eq({ type: 'line', value: 'keep' });
  });

  test('up recalls the previous entry', async () => {
    const { result } = await readWith('\x1b[A\r', { history: ['space list', 'database query'] });
    expect(result).to.deep.eq({ type: 'line', value: 'database query' });
  });

  test('up twice reaches further back', async () => {
    const { result } = await readWith('\x1b[A\x1b[A\r', { history: ['space list', 'database query'] });
    expect(result).to.deep.eq({ type: 'line', value: 'space list' });
  });

  test('up past the oldest entry stays put', async () => {
    const { result } = await readWith('\x1b[A\x1b[A\x1b[A\r', { history: ['only'] });
    expect(result).to.deep.eq({ type: 'line', value: 'only' });
  });

  test('down returns to the in-progress draft', async () => {
    const { result } = await readWith('draft\x1b[A\x1b[B\r', { history: ['recalled'] });
    expect(result).to.deep.eq({ type: 'line', value: 'draft' });
  });

  test('a pasted chunk is inserted verbatim', async () => {
    const { result } = await readWith('space join abc-123-xyz\r');
    expect(result).to.deep.eq({ type: 'line', value: 'space join abc-123-xyz' });
  });

  test('echoes the prompt and buffer', async () => {
    const { bridge } = await readWith('hi\r', { prompt: 'dx> ' });
    expect(bridge.rendered).to.contain('dx> hi');
  });

  test('leaves the cursor on a fresh line after return', async () => {
    const { bridge } = await readWith('hi\r');
    expect(bridge.atLineStart).to.be.true;
  });

  test('ctrl-l clears the screen and repaints', async () => {
    const { bridge, result } = await readWith('keep\x0c\r');
    expect(bridge.writes).to.contain('<clear>');
    expect(result).to.deep.eq({ type: 'line', value: 'keep' });
  });

  test('unsubscribes once the line is read', async () => {
    const { bridge } = await readWith('done\r');
    const before = bridge.writes.length;
    bridge.send('ignored');
    expect(bridge.writes.length).to.eq(before);
  });
});
