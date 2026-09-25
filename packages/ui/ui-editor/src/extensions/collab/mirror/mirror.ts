//
// Copyright 2026 DXOS.org
//

import { ChangeSet, type Extension, Transaction } from '@codemirror/state';
import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import * as A from '@dxos/automerge-proxy/Automerge';
import { type AccessorReplica, heldReplica, leaseReplica } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';

import { Cursor, type CursorConverter } from '../../../util/index.ts';
import { cursorConverter } from '../automerge/cursor.ts';
import { initialSync, isReconcile, reconcileAnnotation } from '../automerge/defs.ts';

/**
 * Two-way sync between the editor and a text in a mirrored document.
 *
 * The mirror already merges with the worker, so the editor only has to keep step with it: its own
 * transactions become splices on the mirror at once, and any other change reaches the editor as the
 * smallest edit that makes the two texts equal. No heads, no `changeAt`, no three-way merge.
 *
 * Writes stay on the mirror, so the object reads what the editor wrote at once. Op-id cursors
 * (comments, presence) need Automerge, so the editor holds a replica of the document for them while
 * it is open.
 */
export const mirrorSync = (accessor: Doc.Accessor): Extension => {
  const replica: { lease?: AccessorReplica } = {};
  return [
    Cursor.converter.of(replicaCursors(accessor, replica)),
    ViewPlugin.fromClass(
      class {
        /** Set while this editor writes to the mirror, whose change event must not come back in. */
        #applying = false;
        #destroyed = false;
        readonly #onChange = () => {
          if (!this.#applying && !this.#destroyed) {
            reconcileText(this._view, textAt(accessor));
          }
        };

        constructor(private readonly _view: EditorView) {
          replica.lease = leaseReplica(accessor);
          accessor.handle.addListener('change', this.#onChange);
          // Out of the update in progress: a compartment swap can hand this binding a view showing another document.
          queueMicrotask(this.#onChange);
        }

        update(update: ViewUpdate): void {
          for (const tr of update.transactions) {
            if (!tr.docChanged || isReconcile(tr) || tr.annotation(Transaction.userEvent) === initialSync.value) {
              continue;
            }
            const edits: { from: number; remove: number; insert: string }[] = [];
            tr.changes.iterChanges((fromA, toA, _fromB, _toB, insert) => {
              edits.push({ from: fromA, remove: toA - fromA, insert: insert.toString() });
            });
            this.#applying = true;
            try {
              accessor.handle.change((doc) => {
                // Later edits first, so earlier positions in the same transaction stay valid.
                for (const { from, remove, insert } of edits.reverse()) {
                  A.splice(doc, accessor.path, from, remove, insert);
                }
              });
            } finally {
              this.#applying = false;
            }
          }
        }

        destroy(): void {
          this.#destroyed = true;
          accessor.handle.removeListener('change', this.#onChange);
          replica.lease?.release();
          replica.lease = undefined;
        }
      },
    ),
  ];
};

/**
 * Cursors come from the replica the editor holds. It trails the mirror by a round trip, so positions
 * map through the difference between the two texts, and there are no cursors until it holds the text.
 * `whenExact` waits for the replica to catch up, when every position has a cursor.
 */
const replicaCursors = (accessor: Doc.Accessor, replica: { lease?: AccessorReplica }): CursorConverter => {
  const converter = cursorConverter(accessor);
  const ready = () => {
    const held = heldReplica(accessor);
    return held !== undefined && typeof Doc.getValue(held) === 'string';
  };
  return {
    toCursor: (position, assoc) => (ready() ? converter.toCursor(position, assoc) : ''),
    fromCursor: (cursor) => (ready() ? converter.fromCursor(cursor) : 0),
    whenExact: async () => {
      const lease = replica.lease;
      // Without a replica (an object outside a database, or one that failed to open) nothing better comes.
      const held = await lease?.ready;
      if (!lease || !held) {
        return;
      }
      await new Promise<void>((resolve) => {
        const check = () => {
          if (lease.inStep() && textAt(held) === textAt(accessor)) {
            held.handle.removeListener('change', check);
            accessor.handle.removeListener('change', check);
            resolve();
          }
        };
        held.handle.addListener('change', check);
        accessor.handle.addListener('change', check);
        check();
      });
    },
  };
};

/** The text an accessor points at; anything that is not a string reads as empty. */
export const textAt = (accessor: Doc.Accessor): string => {
  const value = Doc.getValue<unknown>(accessor);
  return typeof value === 'string' ? value : '';
};

/** Replaces the smallest span that turns the editor's text into `text`. */
const reconcileText = (view: EditorView, text: string): void => {
  const current = view.state.doc.toString();
  if (current === text) {
    return;
  }

  const shorter = Math.min(current.length, text.length);
  let start = 0;
  while (start < shorter && current.charCodeAt(start) === text.charCodeAt(start)) {
    start++;
  }
  let end = 0;
  while (
    end < shorter - start &&
    current.charCodeAt(current.length - 1 - end) === text.charCodeAt(text.length - 1 - end)
  ) {
    end++;
  }

  const changes = ChangeSet.of(
    { from: start, to: current.length - end, insert: text.slice(start, text.length - end) },
    current.length,
  );
  view.dispatch({
    changes,
    // As the Automerge binding maps it: a caret where another writer inserted moves past the insertion.
    selection: view.state.selection.map(changes, 1),
    annotations: reconcileAnnotation.of(true),
  });
};
