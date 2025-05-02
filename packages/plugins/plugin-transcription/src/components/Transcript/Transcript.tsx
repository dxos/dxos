//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { resolveRef, useClient } from '@dxos/react-client';
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
import { type MessageType } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { transcript } from './transcript-extension';
import { type SerializationModel } from '../../model';
import { type TranscriptType } from '../../types';

export const renderMarkdown =
  (identities: Identity[]) =>
  (message: MessageType, debug = false): string[] => {
    // TODO(burdon): Use link/reference markup for users (with popover).
    // TODO(burdon): Color and avatar.
    const identity = identities.find((identity) => identity.did === message.sender.identityDid);
    const name =
      identity?.profile?.displayName ??
      message.sender.contact?.target?.name ??
      message.sender.name ??
      message.sender.email ??
      message.sender.identityDid;
    const blocks = message.blocks.filter((block) => block.type === 'transcription');
    return [
      `###### ${name}` + (debug ? ` (${message.id})` : ''),
      blocks.map((block) => block.text.trim()).join(' '),
      '',
    ];
  };

export type TranscriptProps = ThemedClassName<{
  transcript?: TranscriptType;
  space?: Space;
  model: SerializationModel<MessageType>;
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
              log.info('onLookup', { label, ref });
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
