//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LayoutNode } from '../types';
import { HoverTool } from './hover-tool';
import { type EntityHit, type ToolHost } from './tool';

// PointerEvent is not available in the Node.js test environment; provide a minimal shim.
if (typeof (globalThis as any).PointerEvent === 'undefined') {
  (globalThis as any).PointerEvent = class PointerEvent extends Event {
    readonly clientX: number;
    readonly clientY: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.clientX = init.clientX ?? 0;
      this.clientY = init.clientY ?? 0;
    }
  };
}

class FakeHost implements ToolHost {
  hit: EntityHit;
  framed = 0;
  hitTest(): EntityHit {
    return this.hit;
  }
  emitFrame() {
    this.framed++;
  }
}

const ev = (x: number, y: number) => new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true });

describe('HoverTool', () => {
  test('emits hover-enter when pointer moves over a node', ({ expect }) => {
    const host = new FakeHost();
    const target = new EventTarget();
    const events: string[] = [];
    const tool = new HoverTool((e) => events.push(`${e.type}:${e.entityId}`));
    const detach = tool.attach(host, target);

    const nodeA: LayoutNode = { id: 'a' };
    host.hit = { kind: 'node', node: nodeA };
    target.dispatchEvent(ev(0, 0));

    expect(events).toEqual(['hover-enter:a']);

    detach();
  });

  test('emits hover-leave when pointer moves off a node', ({ expect }) => {
    const host = new FakeHost();
    const target = new EventTarget();
    const events: string[] = [];
    const tool = new HoverTool((e) => events.push(`${e.type}:${e.entityId}`));
    tool.attach(host, target);

    host.hit = { kind: 'node', node: { id: 'a' } };
    target.dispatchEvent(ev(0, 0));
    host.hit = undefined;
    target.dispatchEvent(ev(10, 10));

    expect(events).toEqual(['hover-enter:a', 'hover-leave:a']);
  });

  test('emits hover-leave when the pointer leaves the surface', ({ expect }) => {
    const host = new FakeHost();
    const target = new EventTarget();
    const events: string[] = [];
    const tool = new HoverTool((e) => events.push(`${e.type}:${e.entityId}`));
    tool.attach(host, target);

    host.hit = { kind: 'node', node: { id: 'a' } };
    target.dispatchEvent(ev(0, 0));
    target.dispatchEvent(new PointerEvent('pointerleave', { clientX: 0, clientY: 0 }));

    expect(events).toEqual(['hover-enter:a', 'hover-leave:a']);
  });

  test('detach clears active hover so a reattached tool does not double-emit', ({ expect }) => {
    const host = new FakeHost();
    const target = new EventTarget();
    const events: string[] = [];
    const tool = new HoverTool((e) => events.push(`${e.type}:${e.entityId}`));
    const detach = tool.attach(host, target);

    host.hit = { kind: 'node', node: { id: 'a' } };
    target.dispatchEvent(ev(0, 0));
    detach();

    // Re-attach the same instance; first move should emit hover-enter fresh (no stale "a"
    // carried over via #current).
    tool.attach(host, target);
    host.hit = { kind: 'node', node: { id: 'b' } };
    target.dispatchEvent(ev(0, 0));

    expect(events).toEqual(['hover-enter:a', 'hover-enter:b']);
  });
});
