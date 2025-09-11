//
// Copyright 2025 DXOS.org
//

import { useEffect } from '@preact-signals/safe-react/react';
import React, { type CSSProperties } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, decorateMarkdown, useTextEditor } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { useStreamingText } from '../../hooks';

import { type StreamerOptions, extendedMarkdown, streamer, xmlTags } from './extensions';
import { registry } from './registry';

export type MarkdownStreamImplProps = ThemedClassName<{
  content?: string;
  options?: StreamerOptions;
  userHue?: string;
}>;

const MarkdownStreamImpl = ({ content = '', options, userHue, classNames }: MarkdownStreamImplProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef, view } = useTextEditor(
    {
      initialValue: content,
      extensions: [
        createBasicExtensions({ lineWrapping: true, readOnly: true }),
        createThemeExtensions({ themeMode }),
        // createMarkdownExtensions({ themeMode }),
        extendedMarkdown({ registry }),
        decorateMarkdown(),
        streamer(options),
        xmlTags({ registry }),
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

  return (
    <div
      ref={parentRef}
      className={mx(classNames)}
      style={userHue ? ({ '--user-fill': `var(--dx-${userHue}Surface)` } as CSSProperties) : undefined}
    />
  );
};

export type MarkdownStreamProps = ThemedClassName<
  MarkdownStreamImplProps & {
    cps?: number;
  }
>;

export const MarkdownStream = ({ classNames, content, cps, ...props }: MarkdownStreamProps) => {
  const [str] = useStreamingText(content, cps);
  return <MarkdownStreamImpl classNames={classNames} content={str} {...props} />;
};
