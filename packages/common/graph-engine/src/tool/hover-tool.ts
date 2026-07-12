//
// Copyright 2026 DXOS.org
//

import { type SemanticPointerEvent } from '../types';
import { type Tool, type ToolHost } from './tool';

export type HoverEmit = (event: Extract<SemanticPointerEvent, { type: 'hover-enter' | 'hover-leave' }>) => void;

/**
 * Tracks the entity under the pointer; emits enter/leave around transitions.
 */
export class HoverTool implements Tool {
  readonly id = 'hover';
  #emit: HoverEmit;
  #current?: string;

  constructor(emit: HoverEmit) {
    this.#emit = emit;
  }

  attach(host: ToolHost, target: EventTarget): () => void {
    const onMove = (raw: Event) => {
      const e = raw as PointerEvent;
      const bounds = (target as Element).getBoundingClientRect?.();
      const sx = bounds ? e.clientX - bounds.left : e.clientX;
      const sy = bounds ? e.clientY - bounds.top : e.clientY;
      const hit = host.hitTest(sx, sy);
      const id = hit?.kind === 'node' ? hit.node.id : hit?.kind === 'edge' ? hit.edge.id : undefined;
      if (id === this.#current) {
        return;
      }
      if (this.#current) {
        this.#emit({ type: 'hover-leave', entityId: this.#current, native: e });
      }
      if (id) {
        this.#emit({ type: 'hover-enter', entityId: id, native: e });
      }
      this.#current = id;
    };
    // Clear active hover when the pointer leaves the surface or is cancelled so we don't
    // hold stale state across re-entries.
    const onLeave = (raw: Event) => {
      if (!this.#current) {
        return;
      }
      this.#emit({ type: 'hover-leave', entityId: this.#current, native: raw as PointerEvent });
      this.#current = undefined;
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerleave', onLeave);
    target.addEventListener('pointercancel', onLeave);
    return () => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerleave', onLeave);
      target.removeEventListener('pointercancel', onLeave);
      this.#current = undefined;
    };
  }
}
