//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
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
import { type DataType } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { type SerializationModel } from '../../model';
import { type TranscriptType } from '../../types';

import { transcript } from './transcript-extension';

export const renderMarkdown =
  (identities: Identity[]) =>
  (message: DataType.Message, index: number, debug = false): string[] => {
    if (message.sender.role === 'assistant') {
      // Start/stop block.
      return [message.blocks.find((block) => block._tag === 'transcript')?.text ?? '', ''];
    }

    // TODO(burdon): Use link/reference markup for users (with popover).
    // TODO(burdon): Color and avatar.
    const identity = identities.find((identity) => identity.did === message.sender.identityDid);
    const name =
      identity?.profile?.displayName ??
      message.sender.contact?.target?.fullName ??
      message.sender.name ??
      message.sender.email ??
      message.sender.identityDid;
    const blocks = message.blocks.filter((block) => block._tag === 'transcript');
    return [
      `###### ${name}` + (debug ? ` [${index}]:${message.id}` : ''),
      blocks.map((block) => block.text.trim()).join(' '),
      '',
    ];
  };

export type TranscriptProps = ThemedClassName<{
  transcript?: TranscriptType;
  space?: Space;
  model: SerializationModel<DataType.Message>;
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

  return (
    <div
      ref={parentRef}
      className={mx('flex grow overflow-hidden', editorWidth, classNames)}
      data-popover-collision-boundary={true}
    />
  );
};
