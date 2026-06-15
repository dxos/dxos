//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import { type CleanupFn, type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import { DxAxisResizeInternal, type DxGridAxis, type DxGridFrozenPlane } from './types';

@customElement('dx-grid-axis-resize-handle')
export class DxGridAxisResizeHandle extends LitElement {
  @property({ type: String })
  axis: DxGridAxis = 'row';

  @property({ type: String })
  plane: 'grid' | DxGridFrozenPlane = 'grid';

  @property({ type: String })
  index: string = '-1';

  @property({ type: Number })
  size: number = 128;

  private dragStartSize: number = 128;

  override render() {
    return html`<button
      class="dx-grid__resize-handle"
      data-dx-grid-axis=${this.axis}
      data-dx-grid-action="resize"
      ${ref(this.mount)}
    >
      <span class="sr-only">Resize</span>
    </button>`;
  }

  private cleanup: CleanupFn | null = null;

  private dispatchResize(location: DragLocationHistory, state: 'dragging' | 'dropped'): void {
    const client = this.axis === 'row' ? 'clientY' : 'clientX';
    const event = new DxAxisResizeInternal({
      axis: this.axis,
      plane: this.plane,
      size: this.dragStartSize,
      index: this.index,
      delta: location.current.input[client] - location.initial.input[client],
      state,
    });
    this.dispatchEvent(event);
  }

  private mount(element?: Element): void {
    this.cleanup?.();
    const host = this;
    if (element) {
      this.cleanup = draggable({
        element: element as HTMLButtonElement,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          // We will be moving the line to indicate a drag; we can disable the native drag preview.
          disableNativeDragPreview({ nativeSetDragImage });
          // We don't want any native drop animation for when the user does not drop on a drop target.
          // We want the drag to finish immediately.
          preventUnhandled.start();
        },
        onDragStart() {
          host.dragStartSize = host.size;
        },
        onDrag({ location }) {
          host.dispatchResize(location, 'dragging');
        },
        onDrop({ location }) {
          host.dispatchResize(location, 'dropped');
        },
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanup?.();
  }

  override createRenderRoot(): this {
    return this;
  }
}
