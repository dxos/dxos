//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { type ChangeEvent, DocOps, type MirrorDocHandle } from '@dxos/echo-client';

import { updateCodeMirror } from '../automerge/update-codemirror.ts';

export type MirrorTextBinding = {
  handle: MirrorDocHandle<unknown>;
  /** Path of the text from the document root. */
  path: readonly (string | number)[];
};

/**
 * Two-way sync between the editor and a text in a mirrored document (spike).
 *
 * The mirror already merges with the worker, so the editor only has to keep step with it: its own
 * transactions become splices on the mirror at once, and changes from any other writer arrive as
 * patches against the text the editor shows. No heads, no `changeAt`, no three-way merge here.
 */
export const mirrorSync = ({ handle, path }: MirrorTextBinding): Extension =>
  ViewPlugin.fromClass(
    class {
      /** Set while this editor writes to the mirror, whose change event must not come back in. */
      #applying = false;
      /** Set while other writers' patches are dispatched, so they are not written back as local edits. */
      #receiving = false;
      readonly #onChange = (event: ChangeEvent<unknown>) => {
        if (this.#applying) {
          return;
        }
        this.#receiving = true;
        try {
          updateCodeMirror(this._view, this._view.state.selection, [...path], event.patches);
        } finally {
          this.#receiving = false;
        }
      };

      constructor(private readonly _view: EditorView) {
        handle.on('change', this.#onChange);
      }

      update(update: ViewUpdate): void {
        if (this.#receiving) {
          return;
        }
        for (const tr of update.transactions) {
          if (!tr.docChanged) {
            continue;
          }
          const edits: { from: number; remove: number; insert: string }[] = [];
          tr.changes.iterChanges((fromA, toA, _fromB, _toB, insert) => {
            edits.push({ from: fromA, remove: toA - fromA, insert: insert.toString() });
          });
          this.#applying = true;
          try {
            handle.change((doc) => {
              if (typeof doc !== 'object' || doc === null) {
                return;
              }
              // Later edits first, so earlier positions in the same transaction stay valid.
              for (const { from, remove, insert } of edits.reverse()) {
                DocOps.splice(doc, path, from, remove, insert);
              }
            });
          } finally {
            this.#applying = false;
          }
        }
      }

      destroy(): void {
        handle.off('change', this.#onChange);
      }
    },
  );
