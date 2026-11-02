//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import { type ActionGraphProps, MenuBuilder } from '@dxos/react-ui-menu';
import { commentsState } from '@dxos/ui-editor';
import { createComment } from '@dxos/ui-editor/headless';

import { translationKey } from '#translations';

import { useEditorContext } from './EditorContext.ts';

/** The editor holding the page's caret inside `view` (a widget's field, else `view` itself), when it takes comments. */
const findCommentEditor = (view: EditorView): EditorView | undefined => {
  const node = document.getSelection()?.anchorNode;
  const element = node && (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>('.cm-editor');
  const inner = element && view.dom.contains(element) ? EditorView.findFromDOM(element) : null;
  return [inner, view].find((candidate): candidate is EditorView => !!candidate?.state.field(commentsState, false));
};

/**
 * `customActions` for `Editor.Toolbar`: while the editor takes comments, an action that comments on the selection, in
 * the editor's text or in a field one of its widgets renders.
 */
export const useCommentActions = (): Atom.Atom<ActionGraphProps> => {
  const { controller } = useEditorContext('useCommentActions');
  const view = controller?.view ?? undefined;
  const commentable = view?.state.field(commentsState, false) !== undefined;
  return useMemo(
    () =>
      Atom.make(() =>
        MenuBuilder.make()
          .subgraph(
            view &&
              commentable &&
              ((group) =>
                group.action(
                  'comment',
                  {
                    label: ['comment.label', { ns: translationKey }],
                    icon: 'ph--chat-text--regular',
                    disposition: 'toolbar',
                    testId: 'editor.toolbar.comment',
                  },
                  () => {
                    const target = findCommentEditor(view);
                    target && createComment(target);
                  },
                )),
          )
          .build(),
      ),
    [view, commentable],
  );
};
