//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { DXN } from '@dxos/keys';
import { resolveRef, useClient } from '@dxos/react-client';
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
    `###### \`${block.identityDid}\`` + (debug ? ` (${block.id})` : ''),
    block.segments.map((segment) => segment.text.trim()).join(' '),
    '',
  ];
};

export type TranscriptProps = ThemedClassName<{
  transcript?: TranscriptType;
  space?: Space;
  model: BlockModel<TranscriptBlock>;
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
  const client = useClient();
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      extensions: [
        createBasicExtensions({ readOnly: true, lineWrapping: true }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        decorateMarkdown(),
        space &&
          preview({
            onLookup: async ({ label, ref }) => {
              const dxn = DXN.parse(ref);
              if (!dxn) {
                return null;
              }

              const object = await resolveRef(client, dxn, space);
              return { label, object };
            },
          }),
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
