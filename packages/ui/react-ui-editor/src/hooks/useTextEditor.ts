//
// Copyright 2024 DXOS.org
//

import {
  EditorSelection,
  EditorState,
  type EditorStateConfig,
  type Extension,
  type StateEffect,
} from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type RefObject, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { type ThemeMode } from '@dxos/react-ui';
import { isNotFalsy } from '@dxos/util';

import { type ThemeStyles } from '..//styles';
import { defaultTheme } from '../themes';
import { logChanges } from '../util';

export type UseTextEditorOptions = {
  autoFocus?: boolean;
  scrollTo?: StateEffect<any>;
  debug?: boolean;
} & EditorStateConfig;

export type UseTextEditor = {
  parentRef: RefObject<HTMLDivElement>;
  view?: EditorView;
};

/**
 * Hook for creating editor.
 */
export const useTextEditor = ({
  autoFocus,
  scrollTo,
  debug,
  doc,
  selection,
  extensions,
}: UseTextEditorOptions = {}): UseTextEditor => {
  const onUpdate = useRef<() => void>();
  const [view, setView] = useState<EditorView>();
  const parentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (parentRef.current) {
      // https://codemirror.net/docs/ref/#state.EditorStateConfig
      const state = EditorState.create({
        doc,
        selection,
        extensions: [
          // TODO(burdon): Doesn't catch errors in keymap functions.
          EditorView.exceptionSink.of((err) => {
            log.catch(err);
          }),
          extensions,
          EditorView.updateListener.of(() => {
            onUpdate.current?.();
          }),
        ].filter(isNotFalsy),
      });

      // https://codemirror.net/docs/ref/#view.EditorViewConfig
      const view = new EditorView({
        parent: parentRef.current,
        scrollTo,
        state,
        // NOTE: Uncomment to debug/monitor all transactions.
        // https://codemirror.net/docs/ref/#view.EditorView.dispatch
        dispatchTransactions: (trs, view) => {
          if (debug) {
            logChanges(trs);
          }
          view.update(trs);
        },
      });

      setView(view);
    }

    return () => {
      view?.destroy();
    };
  }, [parentRef]);

  useEffect(() => {
    if (view) {
      // Select end of line if not specified.
      if (!selection && !view.state.selection.main.anchor) {
        selection = EditorSelection.single(view.state.doc.line(1).to);
      }

      // Set selection after first update (since content may rerender on focus).
      // TODO(burdon): BUG on first render may appear in middle of formatted heading.
      // TODO(burdon): Make invisible until first render?
      if (selection || scrollTo) {
        onUpdate.current = () => {
          onUpdate.current = undefined;
          view.dispatch({ selection, effects: scrollTo && [scrollTo], scrollIntoView: !scrollTo });
        };
      }

      if (autoFocus) {
        view.focus();
      }
    }
  }, [view, autoFocus, selection, scrollTo]);

  return { parentRef, view };
};

// TODO(burdon): Factor out extension factories.

export type DataExtensionsOptions = {
  readonly?: boolean;
};

// TODO(burdon): Pass in TextObject (remove model).
export const createDataExtensions = ({ readonly = false } = {}): Extension => {
  return [
    //
    EditorState.readOnly.of(readonly),
    EditorView.editable.of(!readonly),
  ];
};

export type ThemeExtensionsOptions = {
  theme?: ThemeStyles;
  themeMode?: ThemeMode;
  lineWrap?: boolean;
  slots?: {
    editor?: {
      className?: string;
    };
    content?: {
      className?: string;
    };
  };
};

export const createThemeExtensions = ({ theme, themeMode, slots }: ThemeExtensionsOptions = {}): Extension => {
  return [
    //
    EditorView.baseTheme(defaultTheme),
    theme && EditorView.theme(theme),
    EditorView.darkTheme.of(themeMode === 'dark'),
    EditorView.editorAttributes.of({ class: slots?.editor?.className ?? '' }),
    EditorView.contentAttributes.of({ class: slots?.content?.className ?? '' }),
  ].filter(isNotFalsy);
};
