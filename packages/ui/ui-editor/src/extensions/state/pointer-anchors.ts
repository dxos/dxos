//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import {
  type AnchorAtPointDetail,
  DX_ANCHOR_AT_POINT,
  DX_POINT_AT_ANCHOR,
  DX_POINTER_ANCHORS_ATTR,
  type PointAtAnchorDetail,
} from '@dxos/ui-types';

import { Cursor } from '../../util/index.ts';

/**
 * Lets a remote pointer find the same spot in this document however each view wraps it: a point over the text is named by
 * a cursor at the nearest character plus its distance from that character, and a cursor is drawn back at that character.
 * The cursor is the document's own (automerge's when synced), so it survives edits that move the character.
 */
export const pointerAnchors = (): Extension =>
  ViewPlugin.fromClass(
    class {
      readonly #view: EditorView;

      constructor(view: EditorView) {
        this.#view = view;
        view.dom.setAttribute(DX_POINTER_ANCHORS_ATTR, '');
        view.dom.addEventListener(DX_ANCHOR_AT_POINT, this.#anchorAtPoint);
        view.dom.addEventListener(DX_POINT_AT_ANCHOR, this.#pointAtAnchor);
      }

      destroy() {
        this.#view.dom.removeAttribute(DX_POINTER_ANCHORS_ATTR);
        this.#view.dom.removeEventListener(DX_ANCHOR_AT_POINT, this.#anchorAtPoint);
        this.#view.dom.removeEventListener(DX_POINT_AT_ANCHOR, this.#pointAtAnchor);
      }

      readonly #anchorAtPoint = (event: Event) => {
        if (!isAnchorAtPointEvent(event)) {
          return;
        }
        const { x, y } = event.detail;
        // Precise, so a point in the margin or past the last line names nothing rather than the nearest character.
        const pos = this.#view.posAtCoords({ x, y });
        const coords = pos === null ? null : this.#view.coordsAtPos(pos);
        if (pos === null || !coords) {
          return;
        }
        event.detail.anchor = this.#view.state.facet(Cursor.converter).toCursor(pos);
        event.detail.offset = { x: x - coords.left, y: y - coords.top };
      };

      readonly #pointAtAnchor = (event: Event) => {
        if (!isPointAtAnchorEvent(event)) {
          return;
        }
        const { anchor, offset } = event.detail;
        let pos: number;
        try {
          pos = this.#view.state.facet(Cursor.converter).fromCursor(anchor);
        } catch {
          return;
        }
        if (!Number.isInteger(pos) || pos < 0 || pos > this.#view.state.doc.length) {
          return;
        }
        const coords = this.#view.coordsAtPos(pos);
        if (coords) {
          event.detail.point = { x: coords.left + offset.x, y: coords.top + offset.y };
        }
      };
    },
  );

const isPoint = (value: unknown): value is { x: number; y: number } =>
  typeof value === 'object' &&
  value !== null &&
  'x' in value &&
  'y' in value &&
  typeof value.x === 'number' &&
  typeof value.y === 'number';

const isAnchorAtPointEvent = (event: Event): event is CustomEvent<AnchorAtPointDetail> =>
  event instanceof CustomEvent && isPoint(event.detail);

const isPointAtAnchorEvent = (event: Event): event is CustomEvent<PointAtAnchorDetail> =>
  event instanceof CustomEvent &&
  typeof event.detail === 'object' &&
  event.detail !== null &&
  typeof event.detail.anchor === 'string' &&
  isPoint(event.detail.offset);
