//
// Copyright 2025 DXOS.org
//

import { useEffect } from '@preact-signals/safe-react/react';
import React, { type CSSProperties } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, decorateMarkdown, useTextEditor } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { type StreamerOptions, type XmlTagOptions, extendedMarkdown, streamer, xmlTags } from './extensions';

export type MarkdownContentProps = ThemedClassName<
  {
    content?: string;
    userHue?: string; // TODO(burdon): Factor out.
    options?: StreamerOptions;
  } & Pick<XmlTagOptions, 'registry' | 'onEvent'>
>;

export const MarkdownContent = ({
  classNames,
  content = '',
  userHue,
  options,
  registry,
  onEvent,
}: MarkdownContentProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef, view } = useTextEditor(
    {
      initialValue: content,
      extensions: [
        createBasicExtensions({ lineWrapping: true, readOnly: true }),
        createThemeExtensions({
          themeMode,
          slots: {
            scroll: {
              className: 'pie-3 pis-3',
            },
          },
        }),
        extendedMarkdown({ registry }),
        decorateMarkdown(),
        xmlTags({ registry, onEvent }),
        streamer(options),
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
      className={mx('is-full overflow-hidden', classNames)}
      style={userHue ? ({ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties) : undefined}
    />
  );
};
