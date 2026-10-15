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
