//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SemanticPointerEvent } from '../types';
import { SelectTool } from './select-tool';
import { type EntityHit, type ToolHost } from './tool';

// PointerEvent shim for node test environment (mirrors hover-tool.test.ts).
if (typeof (globalThis as any).PointerEvent === 'undefined') {
  (globalThis as any).PointerEvent = class PointerEventShim extends Event {
    clientX: number;
    clientY: number;
    shiftKey: boolean;
    metaKey: boolean;
    constructor(type: string, init: any = {}) {
      super(type, init);
      this.clientX = init.clientX ?? 0;
      this.clientY = init.clientY ?? 0;
      this.shiftKey = !!init.shiftKey;
      this.metaKey = !!init.metaKey;
    }
  };
}

class FakeHost implements ToolHost {
  hit: EntityHit;
  hitTest(): EntityHit {
    return this.hit;
  }
  emitFrame() {}
}

const downEv = (modifiers: { shift?: boolean; meta?: boolean } = {}) =>
  new PointerEvent('pointerdown', { clientX: 0, clientY: 0, shiftKey: !!modifiers.shift, metaKey: !!modifiers.meta });

describe('SelectTool', () => {
  test('emits select on node pointerdown', ({ expect }) => {
    const host = new FakeHost();
    host.hit = { kind: 'node', node: { id: 'a' } };
    const target = new EventTarget();
    const events: SemanticPointerEvent[] = [];
    const tool = new SelectTool((e) => events.push(e));
    tool.attach(host, target);
    target.dispatchEvent(downEv());
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'select', entityId: 'a', additive: false });
  });

  test('additive is true with shift', ({ expect }) => {
    const host = new FakeHost();
    host.hit = { kind: 'node', node: { id: 'a' } };
    const target = new EventTarget();
    const events: SemanticPointerEvent[] = [];
    new SelectTool((e) => events.push(e)).attach(host, target);
    target.dispatchEvent(downEv({ shift: true }));
    expect(events[0]).toMatchObject({ additive: true });
  });

  test('emits nothing on miss', ({ expect }) => {
    const host = new FakeHost();
    host.hit = undefined;
    const target = new EventTarget();
    const events: SemanticPointerEvent[] = [];
    new SelectTool((e) => events.push(e)).attach(host, target);
    target.dispatchEvent(downEv());
    expect(events).toHaveLength(0);
  });
});
