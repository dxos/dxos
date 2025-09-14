//
// Copyright 2025 DXOS.org
//

import React, { useEffect } from 'react';

import { type Space } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  preview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { DocumentAdapter, type SerializationModel } from '../../model';
import { type Transcript } from '../../types';

import { transcript } from './transcript-extension';

// TODO(thure): Move this?
export const renderByline =
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
      // TODO(thure): Use an XML tag with the bits needed here.
      `###### ${name}` + (debug ? ` [${index}]:${message.id}` : ''),
      blocks.map((block) => block.text.trim()).join(' '),
      '',
    ];
  };

export type TranscriptViewProps = ThemedClassName<{
  transcript?: Transcript.Transcript;
  space?: Space;
  model: SerializationModel<DataType.Message>;
  // TODO(wittjosiah): Move to container.
  attendableId?: string;
  ignoreAttention?: boolean;
}>;

/**
 * Transcript component implemented using the editor.
 */
export const TranscriptView = ({
  classNames,
  transcript: object,
  space,
  model,
  attendableId,
  ignoreAttention,
}: TranscriptViewProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef, view } = useTextEditor(() => {
    return {
      extensions: [
        createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        decorateMarkdown(),
        space && preview(),
        transcript({
          model,
          started: object?.started ? new Date(object.started) : undefined,
        }),
      ].filter(isNotFalsy),
    };
  }, [space, model]);

  // Sync the serialization model with the editor view.
  useEffect(() => {
    if (!view) {
      return;
    }

    const adapter = new DocumentAdapter(view);
    model.sync(adapter);
    const unsubscribe = model.update.on(() => {
      model.sync(adapter);
    });
    return () => unsubscribe();
  }, [view, model]);

  return (
    <div
      ref={parentRef}
      className={mx('flex grow overflow-hidden container-max-width', classNames)}
      data-popover-collision-boundary={true /* TODO(thure): Make this a constant and document it. */}
    />
  );
};
