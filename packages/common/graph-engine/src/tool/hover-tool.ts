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
      const hit = host.hitTest(e.clientX, e.clientY);
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
    target.addEventListener('pointermove', onMove);
    return () => target.removeEventListener('pointermove', onMove);
  }
}
