//
// Copyright 2025 DXOS.org
//

import { useEffect } from '@preact-signals/safe-react/react';
import React from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { useStreamingText } from '../../hooks';

import { type TypewriterOptions, extendedMarkdown, xmlTags } from './extensions';

export type TypewriterProps = ThemedClassName<{
  text: string;
  cps?: number;
  options?: TypewriterOptions;
}>;

// TODO(burdon): Remove.
export const Typewriter = ({ classNames, text, cps, options }: TypewriterProps) => {
  const [str] = useStreamingText(text, cps);
  return (
    <div className={mx('inline-block', classNames)}>
      <Markdown content={str} options={options} />
    </div>
  );
};

// TODO(burdon): Thread?
export const Markdown = ({ content = '', options }: { content?: string; options?: TypewriterOptions }) => {
  const { themeMode } = useThemeContext();
  const { parentRef, view } = useTextEditor(
    {
      initialValue: content,
      extensions: [
        // createBasicExtensions({ lineWrapping: true, readOnly: true }),
        // createThemeExtensions({ themeMode }),
        // createMarkdownExtensions({ themeMode }),
        extendedMarkdown(),
        // decorateMarkdown(),
        // typewriter(options),
        xmlTags(),
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
