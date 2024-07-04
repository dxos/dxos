//
// Copyright 2024 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { forwardRef } from 'react';

import { type MessageType } from '@braneframe/types';
import { Surface } from '@dxos/app-framework';
import { type SpaceMember } from '@dxos/client/echo';
import { type Expando, type EchoReactiveObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, DensityProvider, useThemeContext } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions } from '@dxos/react-ui-editor';
import { useTextEditor } from '@dxos/react-ui-editor/src';
import { Mosaic, type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';
import { Message } from '@dxos/react-ui-thread';
import { nonNullable } from '@dxos/util';

import { command } from './command-extension';
import { THREAD_ITEM } from '../meta';
import { getMessageMetadata } from '../util';

const messageControlClassNames = ['p-1 min-bs-0 mie-1 transition-opacity items-start', hoverableControlItem];

export const MessageContainer = ({
  message,
  members,
  onDelete,
}: {
  message: MessageType;
  members: SpaceMember[];
  onDelete: (id: string) => void;
}) => {
  const identity = members.find(
    (member) => message.sender.identityKey && PublicKey.equals(member.identity.identityKey, message.sender.identityKey),
  )?.identity;
  const messageMetadata = getMessageMetadata(message.id, identity);

  return (
    <Message {...messageMetadata}>
      <TextboxBlock message={message} authorId={messageMetadata.authorId} onDelete={() => onDelete(message.id)} />
      {message.parts?.filter(nonNullable).map((part, index) => <MessagePart key={index} part={part} />)}
    </Message>
  );
};

const MessagePart = ({ part }: { part: Expando }) => {
  return (
    <Mosaic.Container id={part.id}>
      <Mosaic.DraggableTile type={THREAD_ITEM} path={part.id} item={part} Component={MessageBlockObjectTile} />
    </Mosaic.Container>
  );
};

const TextboxBlock = ({
  message,
  authorId,
  onDelete,
}: {
  message: MessageType;
  authorId?: string;
  onDelete?: () => void;
}) => {
  const { themeMode } = useThemeContext();
  const identity = useIdentity();
  const readonly = identity?.identityKey.toHex() !== authorId;
  const textboxWidth = onDelete ? 'col-span-2' : 'col-span-3';
  const { parentRef } = useTextEditor(
    () => ({
      doc: message.text,
      // prettier-ignore
      extensions: [
        createBasicExtensions({ readonly }),
        createThemeExtensions({ themeMode }),
        command,
      ],
    }),
    [message, readonly, themeMode],
  );

  return (
    <div
      role='none'
      className={mx('col-span-3 grid grid-cols-subgrid', hoverableControls, hoverableFocusedWithinControls)}
    >
      <div ref={parentRef} className={textboxWidth} />
      {onDelete && (
        <Button
          variant='ghost'
          data-testid='thread.message.delete'
          classNames={messageControlClassNames}
          onClick={onDelete}
        >
          <X />
        </Button>
      )}
    </div>
  );
};

// TODO(burdon): Need delete button for message (not individual blocks)?
const MessageBlockObjectTile: MosaicTileComponent<EchoReactiveObject<any>> = forwardRef(
  ({ draggableStyle, draggableProps, item, onDelete, active, ...props }, forwardedRef) => {
    let title = item.name ?? item.title ?? item.__typename ?? 'Object';
    if (typeof title !== 'string') {
      title = title?.content ?? '';
    }

    return (
      <div
        role='group'
        className={mx('grid col-span-3 py-1 pr-4', hoverableControls, hoverableFocusedWithinControls)}
        style={draggableStyle}
        ref={forwardedRef}
      >
        <DensityProvider density='fine'>
          <Surface
            role='card'
            limit={1}
            data={{ content: item }}
            draggableProps={draggableProps}
            fallback={title}
            {...props}
          />
        </DensityProvider>
      </div>
    );
  },
);
