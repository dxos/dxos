//
// Copyright 2024 DXOS.org
//

import { DotsSixVertical, X } from '@phosphor-icons/react';
import React, { forwardRef, useState } from 'react';

import { type Message as MessageType } from '@braneframe/types';
import { Surface } from '@dxos/app-framework';
import { type SpaceMember } from '@dxos/client/echo';
import { PublicKey } from '@dxos/react-client';
import { type Expando, getTextContent, TextObject } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { TextEditor, useTextModel } from '@dxos/react-ui-editor';
import { Mosaic, type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';
import { Message, type MessageBlockProps, type MessageProps } from '@dxos/react-ui-thread';
import { safeParseJson } from '@dxos/util';

import { useMessageMetadata } from '../hooks';
import { THREAD_ITEM } from '../meta';

type Block = MessageType.Block;

const messageControlClassNames = ['p-1 min-bs-0 mie-1 transition-opacity', hoverableControlItem];

const ObjectBlockTile: MosaicTileComponent<Expando> = forwardRef(
  ({ draggableStyle, draggableProps, item, onRemove, active }, forwardedRef) => {
    let title = item.name ?? item.title ?? item.__typename ?? 'Object';
    if (typeof title !== 'string') {
      title = getTextContent(title);
    }

    return (
      <div
        role='group'
        className={mx(
          'grid',
          active === 'overlay' ? 'grid-cols-[min-content_1fr_min-content]' : 'col-span-3 grid-cols-subgrid',
        )}
        style={draggableStyle}
        ref={forwardedRef}
      >
        <Button variant='ghost' classNames={messageControlClassNames} {...draggableProps}>
          <DotsSixVertical />
        </Button>
        <div role='none' className={onRemove ? '' : 'col-span-2'}>
          <Surface role='message-block' data={item} fallback={title} />
        </div>
        {onRemove && (
          <Button variant='ghost' classNames={messageControlClassNames} onClick={onRemove}>
            <X />
          </Button>
        )}
      </div>
    );
  },
);

const TextboxBlock = ({
  defaultContent,
  onBlockDelete,
}: { defaultContent?: string } & Pick<MessageBlockProps<Block>, 'onBlockDelete'>) => {
  const [textObject] = useState(new TextObject(defaultContent));
  const model = useTextModel({ text: textObject });
  const textboxWidth = onBlockDelete ? 'col-span-2' : 'col-span-3';
  return (
    <div
      role='none'
      className={mx('col-span-3 grid grid-cols-subgrid', hoverableControls, hoverableFocusedWithinControls)}
    >
      {model ? (
        <TextEditor model={model} slots={{ root: { className: textboxWidth } }} />
      ) : (
        <span className={textboxWidth} />
      )}
      {onBlockDelete && (
        <Button variant='ghost' classNames={messageControlClassNames} onClick={onBlockDelete}>
          <X />
        </Button>
      )}
    </div>
  );
};

const MessageBlock = ({ block, onBlockDelete }: MessageBlockProps<Block>) => {
  return block.object ? (
    <Mosaic.Container id={block.object.id} Component={ObjectBlockTile}>
      <Mosaic.DraggableTile
        type={THREAD_ITEM}
        path={block.object.id}
        item={block.object}
        Component={ObjectBlockTile}
        onRemove={onBlockDelete}
      />
    </Mosaic.Container>
  ) : (
    <TextboxBlock
      defaultContent={block.data ? JSON.stringify(safeParseJson(block.data), null, 2) : block.text ?? undefined}
      onBlockDelete={onBlockDelete}
    />
  );
};

export const MessageContainer = ({
  message,
  members,
  onDelete,
}: {
  message: MessageType;
  members: SpaceMember[];
  onDelete: MessageProps<Block>['onDelete'];
}) => {
  const identity = members.find(
    (member) => message.from.identityKey && PublicKey.equals(member.identity.identityKey, message.from.identityKey),
  )?.identity;
  const messageMetadata = useMessageMetadata(message.id, identity);
  return (
    <Message<Block>
      {...messageMetadata}
      onDelete={onDelete}
      blocks={message.blocks ?? []}
      MessageBlockComponent={MessageBlock}
    />
  );
};
