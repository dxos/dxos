//
// Copyright 2025 DXOS.org
//

import { useEffect } from '@preact-signals/safe-react/react';
import React, { type FC } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, decorateMarkdown, useTextEditor } from '@dxos/react-ui-editor';

import { Fallback, Prompt } from './components';
import { type StreamerOptions, type XmlComponentProps, extendedMarkdown, streamer, xmlTags } from './extensions';

// TODO(burdon): Factor out.
const components: Record<string, FC<XmlComponentProps>> = {
  prompt: Prompt,
};

const factory = (tag: string) => components[tag] ?? Fallback;

export type MarkdownContentProps = ThemedClassName<{
  content?: string;
  options?: StreamerOptions;
}>;

export const MarkdownContent = ({ content = '', options }: MarkdownContentProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef, view } = useTextEditor(
    {
      initialValue: content,
      extensions: [
        createBasicExtensions({ lineWrapping: true, readOnly: true }),
        createThemeExtensions({ themeMode }),
        // createMarkdownExtensions({ themeMode }),
        extendedMarkdown(),
        decorateMarkdown(),
        streamer(options),
        xmlTags({ factory }),
      ],
    },
    [themeMode],
  );

  useEffect(() => {
    if (!view) {
      return;
    }

    // TODO(burdon): Convert to hook for appending content.
    requestAnimationFrame(() => {
      // Detect if appending (this prevent jitter of updating the entire doc.)
      if (
        content.length > view.state.doc.length &&
        content.startsWith(view.state.doc.sliceString(0, view.state.doc.length))
      ) {
        const append = content.slice(view.state.doc.length);
        // TODO(burdon): Dispatch effect that indicates append and apply decoration to fade in.
        view.dispatch({
          changes: [{ from: view.state.doc.length, insert: append }],
        });
      } else {
        view.dispatch({
          changes: [{ from: 0, to: view.state.doc.length, insert: content }],
        });
      }
    });
  }, [content, view]);

  return <div ref={parentRef} className='is-full overflow-hidden' />;
};
