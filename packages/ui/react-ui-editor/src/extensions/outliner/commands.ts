//
// Copyright 2025 DXOS.org
//

import { indentMore } from '@codemirror/commands';
import { getIndentUnit } from '@codemirror/language';
import { type ChangeSpec, EditorSelection, type Extension } from '@codemirror/state';
import { type Command, type EditorView, keymap } from '@codemirror/view';

import { getSelection, selectAll, selectDown, selectNone, selectUp } from './selection';
import { getRange, treeFacet } from './tree';

//
// Indentation comnmands.
//

export const indentItemMore: Command = (view: EditorView) => {
  const pos = getSelection(view.state).from;
  const tree = view.state.facet(treeFacet);
  const current = tree.find(pos);
  if (current) {
    const previous = tree.prev(current);
    if (previous && current.level <= previous.level) {
      // TODO(burdon): Indent descendants?
      indentMore(view);
    }
  }

  return true;
};

export const indentItemLess: Command = (view: EditorView) => {
  const pos = getSelection(view.state).from;
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
  const pos = getSelection(view.state)?.from;
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
  const pos = getSelection(view.state)?.from;
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

export const deleteItem: Command = (view: EditorView) => {
  const tree = view.state.facet(treeFacet);
  const pos = getSelection(view.state).from;
  const current = tree.find(pos);
  if (current) {
    view.dispatch({
      selection: EditorSelection.cursor(current.lineRange.from),
      changes: [
        {
          from: current.lineRange.from,
          to: Math.min(current.lineRange.to + 1, view.state.doc.length),
        },
      ],
    });
  }

  return true;
};

export const toggleTask: Command = (view: EditorView) => {
  const tree = view.state.facet(treeFacet);
  const pos = getSelection(view.state)?.from;
  const current = tree.find(pos);
  if (current) {
    const type = current.type === 'task' ? 'bullet' : 'task';
    const indent = ' '.repeat(getIndentUnit(view.state) * current.level);
    view.dispatch({
      changes: [
        {
          from: current.lineRange.from,
          to: current.contentRange.from,
          insert: indent + (type === 'task' ? '- [ ] ' : '- '),
        },
      ],
    });
  }

  return true;
};

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
        const pos = getSelection(view.state).from;
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
        const item = tree.find(getSelection(view.state).from);
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
      run: selectAll,
    },
    {
      key: 'Escape',
      preventDefault: true,
      run: selectNone,
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
