//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { useObject } from '@dxos/echo-react';
import { useTextEditor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
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
 *
 * Like {@link Transcript}, this owns the CodeMirror `EditorView` locally and never carries it in a
 * React prop. This is deliberate: the video article keeps a cross-origin player iframe mounted, and
 * React's dev render-logger walks changed props' object graphs — an `EditorView` reaches the global
 * `window` (via its DOMObserver) and the logger would descend into `window[0]` (the iframe) and throw
 * a cross-origin `SecurityError`. Rendering the summary through a generic Surface (the markdown
 * plugin's editor) reintroduces that prop and crashes the article; this local editor avoids it.
 */
export const Summary = Util.composable<HTMLDivElement, SummaryProps>(
  ({ classNames, id, source, ...props }, forwardedRef) => {
    const themeMode = Hooks.useThemeMode();
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
          createDataExtensions({ id, text: Doc.createAccessor(target, ['content']) }),
          createBasicExtensions({ lineWrapping: true }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
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
