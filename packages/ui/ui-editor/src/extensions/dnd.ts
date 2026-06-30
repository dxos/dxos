//
// Copyright 2024 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

export type DropOptions = {
  onDrop?: (view: EditorView, event: { files: FileList }) => void;
};

/**
 * Whether a drag carries external files. Internal element drags (e.g. an embed's resize handle using
 * native HTML5 DnD) carry custom data-transfer types, not `Files`, so this gates the file-drop UI to
 * real file drags and leaves other drags untouched (otherwise the drop cursor and drop handler would
 * fire for — and interfere with — an in-document resize drag).
 */
const isFileDrag = (event: DragEvent): boolean =>
  !!event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files');

const setDropCursorPos = StateEffect.define<number | null>();

const dropCursorPos = StateField.define<number | null>({
  create: () => null,
  update(pos, tr) {
    if (pos != null && tr.docChanged) {
      pos = tr.changes.mapPos(pos);
    }
    return tr.effects.reduce((value, effect) => (effect.is(setDropCursorPos) ? effect.value : value), pos);
  },
});

type CursorMeasure = { left: number; top: number; height: number };

// Mirrors `@codemirror/view`'s built-in drop cursor, but the `dragover` observer only tracks file
// drags (see `isFileDrag`) so non-file drags never render the cursor.
const drawDropCursor = ViewPlugin.fromClass(
  class {
    cursor: HTMLElement | null = null;
    readonly measureReq: { read: () => CursorMeasure | null; write: (measure: CursorMeasure | null) => void };

    constructor(readonly view: EditorView) {
      this.measureReq = { read: this.readPos.bind(this), write: this.drawCursor.bind(this) };
    }

    update(update: ViewUpdate) {
      const pos = update.state.field(dropCursorPos);
      if (pos == null) {
        this.cursor?.remove();
        this.cursor = null;
      } else {
        if (!this.cursor) {
          this.cursor = this.view.scrollDOM.appendChild(document.createElement('div'));
          this.cursor.className = 'cm-dropCursor';
        }
        if (update.startState.field(dropCursorPos) !== pos || update.docChanged || update.geometryChanged) {
          this.view.requestMeasure(this.measureReq);
        }
      }
    }

    readPos(): CursorMeasure | null {
      const pos = this.view.state.field(dropCursorPos);
      const rect = pos != null && this.view.coordsAtPos(pos);
      if (!rect) {
        return null;
      }
      const outer = this.view.scrollDOM.getBoundingClientRect();
      return {
        left: rect.left - outer.left + this.view.scrollDOM.scrollLeft * this.view.scaleX,
        top: rect.top - outer.top + this.view.scrollDOM.scrollTop * this.view.scaleY,
        height: rect.bottom - rect.top,
      };
    }

    drawCursor(measure: CursorMeasure | null) {
      if (!this.cursor) {
        return;
      }
      const { scaleX, scaleY } = this.view;
      if (measure) {
        this.cursor.style.left = measure.left / scaleX + 'px';
        this.cursor.style.top = measure.top / scaleY + 'px';
        this.cursor.style.height = measure.height / scaleY + 'px';
      } else {
        this.cursor.style.left = '-100000px';
      }
    }

    destroy() {
      this.cursor?.remove();
    }

    setDropPos(pos: number | null) {
      if (this.view.state.field(dropCursorPos) !== pos) {
        this.view.dispatch({ effects: setDropCursorPos.of(pos) });
      }
    }
  },
  {
    eventObservers: {
      dragover(event) {
        if (isFileDrag(event)) {
          this.setDropPos(this.view.posAtCoords({ x: event.clientX, y: event.clientY }));
        }
      },
      dragleave(event) {
        const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;
        if (event.target === this.view.contentDOM || !this.view.contentDOM.contains(related)) {
          this.setDropPos(null);
        }
      },
      dragend() {
        this.setDropPos(null);
      },
      drop() {
        this.setDropPos(null);
      },
    },
  },
);

export const dropFile = (options: DropOptions = {}): Extension => {
  return [
    styles,
    dropCursorPos,
    drawDropCursor,
    EditorView.domEventHandlers({
      drop: (event, view) => {
        // Leave non-file drops (e.g. an embed resize drag) to their own handlers.
        if (!isFileDrag(event)) {
          return false;
        }

        event.preventDefault();
        const files = event.dataTransfer?.files;
        const pos = view.posAtCoords(event);
        if (files?.length && pos !== null) {
          view.dispatch({ selection: { anchor: pos } });
          options.onDrop?.(view, { files });
        }
        return true;
      },
    }),
  ];
};

const styles = EditorView.theme({
  '.cm-dropCursor': {
    borderLeft: '2px solid var(--color-accent-text)',
    color: 'var(--color-accent-text)',
    padding: '0 4px',
  },
  '.cm-dropCursor:after': {
    content: '"←"',
  },
});
