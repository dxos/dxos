//
// Copyright 2025 DXOS.org
//

import { useEffect } from '@preact-signals/safe-react/react';
import React from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { useStreamingText } from '../../hooks';
import { MarkdownViewer } from '../MarkdownViewer';

export type TypewriterProps = ThemedClassName<{
  text: string;
  cps?: number;
}>;

export const Typewriter = ({ classNames, text, cps }: TypewriterProps) => {
  const [str] = useStreamingText(text, cps);
  return (
    <div className={mx('inline-block', classNames)}>
      <MarkdownViewer content={str} />
    </div>
  );
};

export const Cursor = ({ blink }: { blink?: boolean }) => (
  <span className={mx('ml-1', blink && 'animate-blink')}>▌</span>
);

export const Markdown = ({ content = '' }: { content?: string }) => {
  const { themeMode } = useThemeContext();
  const { parentRef, view } = useTextEditor(
    {
      initialValue: content,
      extensions: [
        createBasicExtensions({ lineWrapping: true, readOnly: true }),
        createThemeExtensions({ themeMode }),
        createMarkdownExtensions({ themeMode }),
        decorateMarkdown(), // TODO(burdon): Make option of createMarkdownExtensions.
      ],
    },
    [themeMode],
  );

  useEffect(() => {
    view?.dispatch({
      changes: [{ from: 0, to: view.state.doc.length, insert: content }],
    });
  }, [content, view]);

  return <div ref={parentRef} className='is-full' />;
};
