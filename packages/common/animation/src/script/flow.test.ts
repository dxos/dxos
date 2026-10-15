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
      '      send: { from: a, to: b, color: 3 }',
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
