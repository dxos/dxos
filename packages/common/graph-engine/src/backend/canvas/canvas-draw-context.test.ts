//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { createPath } from '../../draw/path';
import { CanvasDrawContext } from './canvas-draw-context';

const fakeCtx = () => {
  const calls: string[] = [];
  return {
    calls,
    ctx: {
      save: vi.fn(() => calls.push('save')),
      restore: vi.fn(() => calls.push('restore')),
      beginPath: vi.fn(() => calls.push('beginPath')),
      moveTo: vi.fn((x, y) => calls.push(`moveTo(${x},${y})`)),
      lineTo: vi.fn((x, y) => calls.push(`lineTo(${x},${y})`)),
      bezierCurveTo: vi.fn(() => calls.push('bezierCurveTo')),
      arc: vi.fn(() => calls.push('arc')),
      closePath: vi.fn(() => calls.push('closePath')),
      fill: vi.fn(() => calls.push('fill')),
      stroke: vi.fn(() => calls.push('stroke')),
      fillText: vi.fn((s: string) => calls.push(`fillText:${s}`)),
      transform: vi.fn(() => calls.push('transform')),
      set fillStyle(_v: string) {
        calls.push(`fillStyle=${_v}`);
      },
      set strokeStyle(_v: string) {
        calls.push(`strokeStyle=${_v}`);
      },
      set lineWidth(_v: number) {
        calls.push(`lineWidth=${_v}`);
      },
      set font(_v: string) {
        calls.push(`font=${_v}`);
      },
      set textAlign(_v: string) {
        calls.push(`textAlign=${_v}`);
      },
      set textBaseline(_v: string) {
        calls.push(`textBaseline=${_v}`);
      },
    } as unknown as CanvasRenderingContext2D,
  };
};

describe('CanvasDrawContext', () => {
  test('translates a Path to canvas calls and fills', ({ expect }) => {
    const { ctx, calls } = fakeCtx();
    const dc = new CanvasDrawContext(ctx);
    const p = createPath();
    p.moveTo(0, 0);
    p.lineTo(10, 10);
    p.close();
    dc.setFill('#f00');
    dc.fill(p);
    expect(calls).toEqual(['fillStyle=#f00', 'beginPath', 'moveTo(0,0)', 'lineTo(10,10)', 'closePath', 'fill']);
  });

  test('text writes via fillText with alignment', ({ expect }) => {
    const { ctx, calls } = fakeCtx();
    const dc = new CanvasDrawContext(ctx);
    dc.text('hi', 5, 5, { align: 'center', baseline: 'middle' });
    expect(calls).toContain('textAlign=center');
    expect(calls).toContain('textBaseline=middle');
    expect(calls).toContain('fillText:hi');
  });
});
