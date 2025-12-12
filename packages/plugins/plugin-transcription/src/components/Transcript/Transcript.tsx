//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  autoScroll,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  editorSlots,
  preview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { type Message, type Transcript } from '@dxos/types';
import { isTruthy } from '@dxos/util';

import { type SerializationModel } from '../../model';

import { transcript } from './transcript-extension';

// TODO(thure): Move this?
export const renderByline =
  (identities: Identity[]) =>
  (message: Message.Message, index: number, debug = false): string[] => {
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
      // TODO(thure): Use an XML tag with the bits needed here.
      `###### ${name}` + (debug ? ` [${index}]:${message.id}` : ''),
      blocks.map((block) => block.text.trim()).join(' '),
      '',
    ];
  };

export type TranscriptViewProps = ThemedClassName<{
  transcript?: Transcript.Transcript;
  model: SerializationModel<Message.Message>;
  // TODO(burdon): Are these still in use?
  attendableId?: string;
  ignoreAttention?: boolean;
}>;

/**
 * Transcript component implemented using the editor.
 */
export const TranscriptView = ({ classNames, transcript: object, model }: TranscriptViewProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      extensions: [
        createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
        createMarkdownExtensions(),
        createThemeExtensions({ themeMode, slots: editorSlots }),
        decorateMarkdown(),
        preview(),
        transcript({
          model,
          started: object?.started ? new Date(object.started) : undefined,
        }),
        autoScroll(),
      ].filter(isTruthy),
    };
  }, [model]);

  return (
    <div
      ref={parentRef}
      className={mx('flex grow overflow-hidden container-max-width', classNames)}
      data-popover-collision-boundary={true /* TODO(thure): Make this a constant and document it. */}
    />
  );
};
