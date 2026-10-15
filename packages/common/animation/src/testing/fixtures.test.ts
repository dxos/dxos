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
