//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { IconButton, type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createRenderer,
  createThemeExtensions,
  decorateMarkdown,
  editorWidth,
  preview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isNotFalsy } from '@dxos/util';

import { transcript } from './transcript-extension';
import { type BlockModel } from '../../model';
import { type TranscriptType, type TranscriptBlock } from '../../types';

export const renderMarkdown = (block: TranscriptBlock, debug = false): string[] => {
  // TODO(burdon): Use link/reference markup for users (with popover).
  // TODO(burdon): Color and avatar.
  return [
    `###### ${block.authorName}` + (debug ? ` (${block.id})` : ''),
    block.segments.map((segment) => segment.text.trim()).join(' '),
    '',
  ];
};

export type TranscriptProps = ThemedClassName<{
  transcript?: TranscriptType;
  space?: Space;
  model: BlockModel<TranscriptBlock>;
  // TODO(wittjosiah): Move to container.
  attendableId?: string;
  ignoreAttention?: boolean;
}>;

/**
 * Transcript component implemented using the editor.
 */
export const Transcript = ({
  classNames,
  transcript: object,
  space,
  model,
  attendableId,
  ignoreAttention,
}: TranscriptProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      extensions: [
        createBasicExtensions({ readOnly: true, lineWrapping: true }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        decorateMarkdown(),
        space && preview(),
        transcript({
          model,
          started: object?.started ? new Date(object.started) : undefined,
          renderButton: createRenderer(({ onClick }) => (
            <IconButton icon='ph--arrow-line-down--regular' iconOnly label='Scroll to bottom' onClick={onClick} />
          )),
        }),
      ].filter(isNotFalsy),
    };
  }, [space, model]);

  return <div ref={parentRef} className={mx('flex grow overflow-hidden', editorWidth, classNames)} />;
};
