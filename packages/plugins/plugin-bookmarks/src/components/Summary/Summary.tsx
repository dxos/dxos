//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { composable, composableProps, composeRefs, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
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
export const Summary = composable<HTMLDivElement, SummaryProps>(
  ({ classNames, id, source, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef } = useTextEditor(() => {
      const target = source?.target;
      if (!target) {
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
    }, [themeMode, id, source?.target]);

    return (
      <div
        {...composableProps(props, { classNames: ['dx-expand', classNames] })}
        ref={composeRefs(parentRef, forwardedRef)}
      />
    );
  },
);
