//
// Copyright 2026 DXOS.org
//

import { type SemanticPointerEvent } from '../types';
import { type Tool, type ToolHost } from './tool';

export type SelectEmit = (event: Extract<SemanticPointerEvent, { type: 'select' }>) => void;

export class SelectTool implements Tool {
  readonly id = 'select';
  #emit: SelectEmit;

  constructor(emit: SelectEmit) {
    this.#emit = emit;
  }

  attach(host: ToolHost, target: EventTarget): () => void {
    const onDown = (raw: Event) => {
      const e = raw as PointerEvent;
      const bounds = (target as Element).getBoundingClientRect?.();
      const sx = bounds ? e.clientX - bounds.left : e.clientX;
      const sy = bounds ? e.clientY - bounds.top : e.clientY;
      const hit = host.hitTest(sx, sy);
      if (!hit) {
        return;
      }
      const id = hit.kind === 'node' ? hit.node.id : hit.edge.id;
      this.#emit({ type: 'select', entityId: id, additive: e.shiftKey || e.metaKey, native: e });
    };
    target.addEventListener('pointerdown', onDown);
    return () => target.removeEventListener('pointerdown', onDown);
  }
}
