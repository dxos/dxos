//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { useObject } from '@dxos/echo-react';
import { useTextEditor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import * as Util from '@dxos/react-ui/Util';
import { type Text } from '@dxos/schema';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
} from '@dxos/ui-editor';

export type SummaryProps = {
  /** Stable editor/document id (used for collaboration + selection state). */
  id: string;
  /** The summary text object. */
  source?: Ref.Ref<Text.Text>;
};

/**
 * Editable markdown view of a summary text object, live-bound to its ECHO content.
 * Mirrors plugin-video's Summary: the CodeMirror `EditorView` is owned locally and never carried in
 * a React prop, keeping the article's prop graph free of non-serializable editor state.
 */
export const Summary = Util.composable<HTMLDivElement, SummaryProps>(
  ({ classNames, id, source, ...props }, forwardedRef) => {
    const { themeMode } = ThemeProvider.useThemeContext();
    // Subscribe to the ref's target so the editor (re-)initializes once it resolves; a `Ref`'s `.target`
    // loads asynchronously and isn't reactive on its own.
    const [resolved] = useObject(source);
    const { parentRef } = useTextEditor(() => {
      const target = source?.target;
      if (!resolved || !target) {
        return {};
      }

      return {
        initialValue: target.content ?? '',
        extensions: [
          createBasicExtensions({ lineWrapping: true }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          createDataExtensions({ id, text: Doc.createAccessor(target, ['content']) }),
          createMarkdownExtensions(),
          decorateMarkdown(),
        ],
      };
    }, [themeMode, id, resolved]);

    return (
      <div
        {...Util.composableProps(props, { classNames: ['dx-expand', classNames] })}
        ref={Hooks.composeRefs(parentRef, forwardedRef)}
      />
    );
  },
);
