//
// Copyright 2025 DXOS.org
//

import { type ChangeSpec, EditorState, type Extension } from '@codemirror/state';

// TODO(burdon): Toggle list/task mode.
// TODO(burdon): Convert to task object and insert link.
// TOOD(burdon): Can we support continuation lines and rich formatting?

/**
 * Outliner extension.
 */
export const outliner = (): Extension =>
  EditorState.transactionFilter.of((tr) => {
    const indentLevel = 2;

    // Don't allow cursor before marker.
    if (!tr.docChanged) {
      const pos = tr.selection?.ranges[tr.selection?.mainIndex]?.from;
      if (pos != null) {
        const line = tr.startState.doc.lineAt(pos);
        if (pos === line.from) {
          // TODO(burdon): Check if nav from previous line.
          return []; // Skip.
        }
      }
      return tr;
    }

    const changes: ChangeSpec[] = [];
    tr.changes.iterChanges((fromA, toA, fromB, toB, insert) => {
      // NOTE: Task markers are atomic so will be deleted when backspace is pressed.
      // NOTE: CM inserts 2 or 6 spaces when deleting a list or task marker to create a continuation.
      // - [ ] <- backspace here deletes the task marker.
      // - [ ] <- backspace here inserts 6 spaces (creates continuation).
      //   - [ ] <- backspace here deletes the task marker.

      const line = tr.startState.doc.lineAt(fromA);
      const isTaskMarker = line.text.match(/^\s*- (\[ \]|\[x\])? /);
      if (isTaskMarker) {
        // Detect replacement of task marker with continuation.
        if (fromB === line.from && toB === line.to) {
          changes.push({ from: line.from - 1, to: toA });
          return;
        }

        // Detect deletion of marker; or pressing ENTER on empty line.
        if (fromB === toB) {
          if (toA === line.to) {
            const line = tr.state.doc.lineAt(fromA);
            if (line.text.match(/^\s*$/)) {
              if (line.from === 0) {
                // Don't delete first line.
                changes.push({ from: 0, to: 0 });
              } else {
                // Delete indent and marker.
                changes.push({ from: line.from - 1, to: toA });
              }
            }
          }
          return;
        }

        // Check appropriate indentation relative to previous line.
        if (insert.length === indentLevel) {
          if (line.number === 1) {
            changes.push({ from: 0, to: 0 });
          } else {
            const getIndent = (text: string) => (text.match(/^\s*/)?.[0]?.length ?? 0) / indentLevel;
            const currentIndent = getIndent(line.text);
            const indentPrevious = getIndent(tr.state.doc.lineAt(fromA - 1).text);
            if (currentIndent > indentPrevious) {
              changes.push({ from: 0, to: 0 });
            }
          }
        }

        // TODO(burdon): Detect pressing ENTER on empty line that is indented.
        // TOOD(burdon): Error if start with link (e.g., `[]()`).
      }
    });

    if (changes.length > 0) {
      return [{ changes }];
    }

    return tr;
  });
