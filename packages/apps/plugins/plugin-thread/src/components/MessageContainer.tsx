//
// Copyright 2024 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { forwardRef } from 'react';

import { type TextV0Type, type BlockType, type MessageType } from '@braneframe/types';
import { Surface } from '@dxos/app-framework';
import { type SpaceMember } from '@dxos/client/echo';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, DensityProvider, useThemeContext } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions } from '@dxos/react-ui-editor';
import { useTextEditor } from '@dxos/react-ui-editor/src';
import { Mosaic, type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';
import { Message, type MessageBlockProps, type MessageProps } from '@dxos/react-ui-thread';

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
  onDelete: MessageProps<BlockType>['onDelete'];
}) => {
  const identity = members.find(
    (member) => message.from.identityKey && PublicKey.equals(member.identity.identityKey, message.from.identityKey),
  )?.identity;
  const messageMetadata = getMessageMetadata(message.id, identity);

  return (
    <Message<BlockType>
      {...messageMetadata}
      blocks={message.blocks ?? []}
      MessageBlockComponent={MessageBlock}
      onDelete={onDelete}
    />
  );
};

const MessageBlock = ({ block, authorId, onBlockDelete }: MessageBlockProps<BlockType>) => {
  return block.object ? (
    <Mosaic.Container id={block.object.id}>
      <Mosaic.DraggableTile
        type={THREAD_ITEM}
        path={block.object.id}
        item={block.object}
        Component={MessageBlockObjectTile}
        onDelete={onBlockDelete}
      />
    </Mosaic.Container>
  ) : block.content ? (
    <TextboxBlock text={block.content} authorId={authorId} onBlockDelete={onBlockDelete} />
  ) : null;
};

const TextboxBlock = ({
  text,
  authorId,
  onBlockDelete,
}: { text: TextV0Type } & Pick<MessageBlockProps<BlockType>, 'authorId' | 'onBlockDelete'>) => {
  const { themeMode } = useThemeContext();
  const identity = useIdentity();
  const readonly = identity?.identityKey.toHex() !== authorId;
  const textboxWidth = onBlockDelete ? 'col-span-2' : 'col-span-3';
  const { parentRef } = useTextEditor(
    () => ({
      doc: text.content,
      // prettier-ignore
      extensions: [
        createBasicExtensions({ readonly }),
        createThemeExtensions({ themeMode }),
        command,
      ],
    }),
    [text, readonly, themeMode],
  );

  return (
    <div
      role='none'
      className={mx('col-span-3 grid grid-cols-subgrid', hoverableControls, hoverableFocusedWithinControls)}
    >
      <div ref={parentRef} className={textboxWidth} />
      {onBlockDelete && (
        <Button
          variant='ghost'
          data-testid='thread.message.delete'
          classNames={messageControlClassNames}
          onClick={onBlockDelete}
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
