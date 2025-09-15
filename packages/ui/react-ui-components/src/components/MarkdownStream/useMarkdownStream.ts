//
// Copyright 2025 DXOS.org
//

import { useThemeContext } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, decorateMarkdown, useTextEditor } from '@dxos/react-ui-editor';

import { useStreamingText } from '../../hooks';

import { extendedMarkdown, streamer, xmlTags } from './extensions';
import { type UseMarkdownStreamProps } from './types';

export const useMarkdownStream = ({ content, perCharacterDelay = 0, ...options }: UseMarkdownStreamProps) => {
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
              className: 'pli-cardSpacingInline plb-cardSpacingBlock',
            },
          },
        }),
        extendedMarkdown(options),
        decorateMarkdown(),
        xmlTags(options),
        streamer(options),
      ],
    },
    [themeMode],
  );
  useStreamingText(content, view, perCharacterDelay);
  return { parentRef, content };
};
