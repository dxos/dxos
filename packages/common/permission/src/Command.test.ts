//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Command from './Command.ts';

describe('Command', () => {
  test('accepts / and lowercase paths', ({ expect }) => {
    expect(Command.isCommand('/')).toBe(true);
    expect(Command.isCommand('/space/write')).toBe(true);
    expect(Command.isCommand('/email/send')).toBe(true);
  });

  test('rejects malformed paths', ({ expect }) => {
    expect(Command.isCommand('')).toBe(false);
    expect(Command.isCommand('space/write')).toBe(false);
    expect(Command.isCommand('/space/')).toBe(false);
    expect(Command.isCommand('/Space/Write')).toBe(false);
    expect(Command.isCommand('/space//write')).toBe(false);
    expect(() => Command.make('/space/')).toThrow();
  });

  test('segments', ({ expect }) => {
    expect(Command.segments(Command.ROOT)).toEqual([]);
    expect(Command.segments(Command.make('/space/write'))).toEqual(['space', 'write']);
  });

  test('covers by prefix, never by string prefix', ({ expect }) => {
    const space = Command.make('/space');
    const write = Command.make('/space/write');
    const spaces = Command.make('/spaces');
    expect(Command.covers(Command.ROOT, write)).toBe(true);
    expect(Command.covers(space, space)).toBe(true);
    expect(Command.covers(space, write)).toBe(true);
    expect(Command.covers(write, space)).toBe(false);
    expect(Command.covers(space, spaces)).toBe(false);
    expect(Command.covers(write, Command.ROOT)).toBe(false);
  });

  test('intersect narrows to the deeper path or nothing', ({ expect }) => {
    const space = Command.make('/space');
    const write = Command.make('/space/write');
    const email = Command.make('/email/send');
    expect(Command.intersect(space, write)).toBe(write);
    expect(Command.intersect(write, space)).toBe(write);
    expect(Command.intersect(Command.ROOT, email)).toBe(email);
    expect(Command.intersect(write, email)).toBeUndefined();
  });
});
