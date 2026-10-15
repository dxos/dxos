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
