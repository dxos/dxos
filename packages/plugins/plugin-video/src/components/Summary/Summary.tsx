//
// Copyright 2026 DXOS.org
//

import { composeRefs } from '@radix-ui/react-compose-refs';
import React from 'react';

import { type Ref } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { useObject } from '@dxos/react-client/echo';
import { composable, composableProps, useThemeContext } from '@dxos/react-ui';
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
 *
 * Like {@link Transcript}, this owns the CodeMirror `EditorView` locally and never carries it in a
 * React prop. This is deliberate: the video article keeps a cross-origin player iframe mounted, and
 * React's dev render-logger walks changed props' object graphs — an `EditorView` reaches the global
 * `window` (via its DOMObserver) and the logger would descend into `window[0]` (the iframe) and throw
 * a cross-origin `SecurityError`. Rendering the summary through a generic Surface (the markdown
 * plugin's editor) reintroduces that prop and crashes the article; this local editor avoids it.
 */
export const Summary = composable<HTMLDivElement, SummaryProps>(({ classNames, id, source, ...props }, forwardedRef) => {
  const { themeMode } = useThemeContext();
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
        createDataExtensions({ id, text: createDocAccessor(target, ['content']) }),
        createBasicExtensions({ lineWrapping: true }),
        createThemeExtensions({ themeMode, slots: documentSlots }),
        createMarkdownExtensions(),
        decorateMarkdown(),
      ],
    };
  }, [themeMode, id, resolved]);

  return (
    <div
      {...composableProps(props, { classNames: ['dx-container', classNames] })}
      ref={composeRefs(parentRef, forwardedRef)}
    />
  );
});
