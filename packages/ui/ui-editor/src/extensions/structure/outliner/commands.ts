//
// Copyright 2025 DXOS.org
//

import { getIndentUnit } from '@codemirror/language';
import { type ChangeSpec, EditorSelection, type EditorState, type Extension } from '@codemirror/state';
import { type Command, type EditorView, keymap } from '@codemirror/view';

import { blockSelectionField, setBlockSelection } from '../blocks';
import { mergeRanges, selectAllItems, selectDown, selectNoneItems, selectUp } from './dnd';
import { type Item, getRange, treeFacet } from './tree';

//
// Menu / action scope.
//

/**
 * The items a menu action operates on: the block selection expanded to whole subtrees, or — with no
 * selection — the caret's item. Menu commands (delete, toggle, ...) act over this scope so that a
 * selected subtree is the unit of the action rather than a single line.
 */
export const getActionScope = (state: EditorState): Item[] => {
  const tree = state.facet(treeFacet);
  const anchors = state.field(blockSelectionField, false) ?? [];
  const found =
    anchors.length > 0 ? anchors.map((anchor) => tree.find(anchor)) : [tree.find(state.selection.main.from)];
  return found.filter((item): item is Item => item != null);
};

//
// Indentation comnmands.
//

export const indentItemMore: Command = (view: EditorView) => {
  const pos = view.state.selection.main.from;
  const tree = view.state.facet(treeFacet);
  const current = tree.find(pos);
  if (current) {
    const previous = tree.prev(current);
    if (previous && current.level <= previous.level) {
      // Indent the current line and all descendants so the whole subtree moves with its parent.
      // NOTE: The markdown extension doesn't provide an indentation service.
      const insert = ' '.repeat(getIndentUnit(view.state));
      const changes: ChangeSpec[] = [];
      tree.traverse(current, (item) => {
        const line = view.state.doc.lineAt(item.lineRange.from);
        changes.push({ from: line.from, insert });
      });

      if (changes.length > 0) {
        view.dispatch({ changes });
      }
    }
  }

  return true;
};

export const indentItemLess: Command = (view: EditorView) => {
  const pos = view.state.selection.main.from;
  const tree = view.state.facet(treeFacet);
  const current = tree.find(pos);
  if (current) {
    if (current.level > 0) {
      // Unindent current line and all descendants.
      // NOTE: The markdown extension doesn't provide an indentation service.
      const indentUnit = getIndentUnit(view.state);
      const changes: ChangeSpec[] = [];
      tree.traverse(current, (item) => {
        const line = view.state.doc.lineAt(item.lineRange.from);
        changes.push({ from: line.from, to: line.from + indentUnit });
      });

      if (changes.length > 0) {
        view.dispatch({ changes });
      }
    }
  }

  return true;
};

//
// Moving commands.
//

export const moveItemDown: Command = (view: EditorView) => {
  const pos = view.state.selection.main.from;
  const tree = view.state.facet(treeFacet);
  const current = tree.find(pos);
  if (current && current.nextSibling) {
    const next = current.nextSibling;
    const currentContent = view.state.doc.sliceString(...getRange(tree, current));
    const nextContent = view.state.doc.sliceString(...getRange(tree, next));
    const changes: ChangeSpec[] = [
      {
        from: current.lineRange.from,
        to: current.lineRange.from + currentContent.length,
        insert: nextContent,
      },
      {
        from: next.lineRange.from,
        to: next.lineRange.from + nextContent.length,
        insert: currentContent,
      },
    ];

    view.dispatch({
      changes,
      selection: EditorSelection.cursor(pos + nextContent.length + 1),
      scrollIntoView: true,
    });
  }

  return true;
};

export const moveItemUp: Command = (view: EditorView) => {
  const pos = view.state.selection.main.from;
  const tree = view.state.facet(treeFacet);
  const current = tree.find(pos);
  if (current && current.prevSibling) {
    const prev = current.prevSibling;
    const currentContent = view.state.doc.sliceString(...getRange(tree, current));
    const prevContent = view.state.doc.sliceString(...getRange(tree, prev));
    const changes: ChangeSpec[] = [
      {
        from: prev.lineRange.from,
        to: prev.lineRange.from + prevContent.length,
        insert: currentContent,
      },
      {
        from: current.lineRange.from,
        to: current.lineRange.from + currentContent.length,
        insert: prevContent,
      },
    ];

    view.dispatch({
      changes,
      selection: EditorSelection.cursor(pos - prevContent.length - 1),
      scrollIntoView: true,
    });
  }

  return true;
};

//
// Misc commands.
//

/** Deletes the action scope — each selected item's whole subtree (or the caret item's) — and clears the selection. */
export const deleteItem: Command = (view: EditorView) => {
  const { state } = view;
  const tree = state.facet(treeFacet);
  const items = getActionScope(state);
  if (items.length === 0) {
    return true;
  }

  // Each item's whole subtree plus its trailing newline; merged so a selected parent and child (or
  // adjacent selections) collapse into one non-overlapping range.
  const ranges = mergeRanges(
    items.map((item) => {
      const [from, to] = getRange(tree, item);
      return { from, to: Math.min(to + 1, state.doc.length) };
    }),
  );

  view.dispatch({
    changes: ranges.map((range) => ({ from: range.from, to: range.to })),
    selection: EditorSelection.cursor(ranges[0].from),
    effects: setBlockSelection.of([]),
    userEvent: 'delete.item',
  });

  return true;
};

/** Toggles every item in the action scope between task and bullet, uniformly (by the first item's type). */
export const toggleTask: Command = (view: EditorView) => {
  const { state } = view;
  const items = getActionScope(state);
  if (items.length === 0) {
    return true;
  }

  const unit = getIndentUnit(state);
  const toTask = items[0].type !== 'task';
  const changes: ChangeSpec[] = items
    .filter((item) => (toTask ? item.type !== 'task' : item.type === 'task'))
    .map((item) => ({
      from: item.lineRange.from,
      to: item.contentRange.from,
      insert: ' '.repeat(unit * item.level) + (toTask ? '- [ ] ' : '- '),
    }));

  if (changes.length > 0) {
    view.dispatch({ changes });
  }

  return true;
};

/** Keymap binding outliner keys: Tab indent, Enter continuation, arrow navigation, move, delete, and toggle-task. */
export const commands = (): Extension =>
  keymap.of([
    //
    // Indentation.
    //
    {
      key: 'Tab',
      preventDefault: true,
      run: indentItemMore,
      shift: indentItemLess,
    },

    //
    // Continuation.
    //
    {
      key: 'Enter',
      shift: (view) => {
        const pos = view.state.selection.main.from;
        const insert = '\n  '; // TODO(burdon): Fix parsing.
        view.dispatch({
          changes: [{ from: pos, to: pos, insert }],
          selection: EditorSelection.cursor(pos + insert.length),
        });
        return true;
      },
    },

    //
    // Navigation.
    //
    {
      key: 'ArrowDown',
      // Jump to next item (default moves to end of currentline).
      run: (view) => {
        const tree = view.state.facet(treeFacet);
        const item = tree.find(view.state.selection.main.from);
        if (
          item &&
          view.state.doc.lineAt(item.lineRange.to).number - view.state.doc.lineAt(item.lineRange.from).number === 0
        ) {
          const next = tree.next(item);
          if (next) {
            view.dispatch({ selection: EditorSelection.cursor(next.contentRange.from) });
            return true;
          }
        }

        return false;
      },
    },

    //
    // Line selection.
    // TODO(burdon): Shortcut to select current item?
    //
    {
      key: 'Mod-a',
      preventDefault: true,
      run: selectAllItems,
    },
    {
      key: 'Escape',
      preventDefault: true,
      run: selectNoneItems,
    },
    {
      key: 'ArrowUp',
      shift: selectUp,
    },
    {
      key: 'ArrowDown',
      shift: selectDown,
    },

    //
    // Move.
    //
    {
      key: 'Alt-ArrowDown',
      preventDefault: true,
      run: moveItemDown,
    },
    {
      key: 'Alt-ArrowUp',
      preventDefault: true,
      run: moveItemUp,
    },
    //
    // Delete.
    //
    {
      key: 'Mod-Backspace',
      preventDefault: true,
      run: deleteItem,
    },
    //
    // Misc.
    //
    {
      key: 'Alt-t',
      preventDefault: true,
      run: toggleTask,
    },
  ]);
