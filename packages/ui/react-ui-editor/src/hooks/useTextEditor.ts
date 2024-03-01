//
// Copyright 2024 DXOS.org
//

import { closeBrackets } from '@codemirror/autocomplete';
import { history } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import {
  EditorSelection,
  EditorState,
  type EditorStateConfig,
  type Extension,
  type StateEffect,
} from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  lineNumbers,
  placeholder,
  scrollPastEnd,
} from '@codemirror/view';
import defaultsDeep from 'lodash.defaultsdeep';
import { type DependencyList, type RefObject, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { type ThemeMode } from '@dxos/react-ui';
import { isNotFalsy } from '@dxos/util';

import { type ThemeStyles } from '../styles';
import { defaultTheme } from '../themes';
import { logChanges } from '../util';

export type UseTextEditorOptions = {
  autoFocus?: boolean;
  scrollTo?: StateEffect<any>;
  debug?: boolean;
} & EditorStateConfig;

// TODO(burdon): Return tuple?
export type UseTextEditor = {
  parentRef: RefObject<HTMLDivElement>;
  view?: EditorView;
};

/**
 * Hook for creating editor.
 */
// TODO(wittjosiah): Does not work in strict mode.
export const useTextEditor = (
  { autoFocus, scrollTo, debug, doc, selection, extensions }: UseTextEditorOptions = {},
  deps: DependencyList = [],
): UseTextEditor => {
  const onUpdate = useRef<() => void>();
  const [view, setView] = useState<EditorView>();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let view: EditorView;
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
      view = new EditorView({
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
  }, deps);

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

/**
 * https://codemirror.net/docs/extensions
 * https://github.com/codemirror/basic-setup
 */
// TODO(burdon): Reconcile with createMarkdownExtensions.
export type BasicExtensionsOptions = {
  allowMultipleSelections?: boolean;
  bracketMatching?: boolean;
  closeBrackets?: boolean;
  crosshairCursor?: boolean;
  dropCursor?: boolean;
  drawSelection?: boolean;
  editable?: boolean;
  highlightActiveLine?: boolean;
  history?: boolean;
  lineNumbers?: boolean;
  lineWrapping?: boolean;
  placeholder?: string;
  readonly?: boolean;
  scrollPastEnd?: boolean;
  tabSize?: number;
};

const defaults: BasicExtensionsOptions = {
  bracketMatching: true,
  closeBrackets: true,
  drawSelection: true,
  editable: true,
  history: true,
  lineWrapping: true,
};

export const createBasicExtensions = (_props?: BasicExtensionsOptions): Extension => {
  const props: BasicExtensionsOptions = defaultsDeep({}, _props, defaults);
  console.log(JSON.stringify(props, null, 2));
  return [
    // TODO(burdon): Doesn't catch errors in keymap functions.
    EditorView.exceptionSink.of((err) => {
      log.catch(err);
    }),

    props.allowMultipleSelections && EditorState.allowMultipleSelections.of(true),
    props.bracketMatching && bracketMatching(),
    props.closeBrackets && closeBrackets(),
    props.crosshairCursor && crosshairCursor(),
    props.dropCursor && dropCursor(),
    props.drawSelection && drawSelection(),
    props.highlightActiveLine && highlightActiveLine(),
    props.history && history(),
    props.lineNumbers && lineNumbers(),
    props.lineWrapping && EditorView.lineWrapping,
    props.placeholder && placeholder(props.placeholder),
    props.readonly && [EditorState.readOnly.of(true), EditorView.editable.of(false)],
    props.scrollPastEnd && scrollPastEnd(),
    props.tabSize && EditorState.tabSize.of(props.tabSize),
  ].filter(isNotFalsy);
};

export type ThemeExtensionsOptions = {
  theme?: ThemeStyles;
  themeMode?: ThemeMode;
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
    EditorView.baseTheme(defaultTheme),
    EditorView.darkTheme.of(themeMode === 'dark'),
    theme && EditorView.theme(theme),
    slots?.editor?.className && EditorView.editorAttributes.of({ class: slots.editor.className }),
    slots?.content?.className && EditorView.contentAttributes.of({ class: slots.content.className }),
  ].filter(isNotFalsy);
};
