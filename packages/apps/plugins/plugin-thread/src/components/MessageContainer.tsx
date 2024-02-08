//
// Copyright 2024 DXOS.org
//

import { DotsSixVertical, X } from '@phosphor-icons/react';
import React, { forwardRef } from 'react';

import { type Message as MessageType } from '@braneframe/types';
import { Surface } from '@dxos/app-framework';
import { type SpaceMember } from '@dxos/client/echo';
import { PublicKey } from '@dxos/react-client';
import { type Expando, getTextContent, type TextObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, useTranslation } from '@dxos/react-ui';
import { TextEditor, useTextModel } from '@dxos/react-ui-editor';
import { Mosaic, type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';
import { Message, type MessageBlockProps, type MessageProps } from '@dxos/react-ui-thread';

import { command } from './command-extension';
import { useMessageMetadata } from '../hooks';
import { THREAD_ITEM, THREAD_PLUGIN } from '../meta';

type Block = MessageType.Block;

const messageControlClassNames = ['p-1 min-bs-0 mie-1 transition-opacity items-start', hoverableControlItem];

const ObjectBlockTile: MosaicTileComponent<Expando> = forwardRef(
  ({ draggableStyle, draggableProps, item, onRemove, active }, forwardedRef) => {
    const { t } = useTranslation(THREAD_PLUGIN);
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
          hoverableControls,
          hoverableFocusedWithinControls,
        )}
        style={draggableStyle}
        ref={forwardedRef}
      >
        <Button
          variant='ghost'
          classNames={['pli-0 plb-1 min-bs-0 transition-opacity', hoverableControlItem]}
          {...draggableProps}
        >
          <DotsSixVertical />
        </Button>
        <div role='none' className={onRemove ? '' : 'col-span-2'}>
          <Surface role='message-block' data={item} fallback={title} />
        </div>
        {onRemove && (
          <Button
            variant='ghost'
            classNames={['p-1.5 min-bs-0 mie-1 transition-opacity items-start', hoverableControlItem]}
            onClick={onRemove}
          >
            <X />
            <span className='sr-only'>{t('delete message block label')}</span>
          </Button>
        )}
      </div>
    );
  },
);

const TextboxBlock = ({
  text,
  authorId,
  onBlockDelete,
}: { text: TextObject } & Pick<MessageBlockProps<Block>, 'authorId' | 'onBlockDelete'>) => {
  const identity = useIdentity();
  const model = useTextModel({ text });
  const textboxWidth = onBlockDelete ? 'col-span-2' : 'col-span-3';
  const readonly = identity?.identityKey.toHex() !== authorId;

  return (
    <div
      role='none'
      className={mx('col-span-3 grid grid-cols-subgrid', hoverableControls, hoverableFocusedWithinControls)}
    >
      {model ? (
        <TextEditor
          model={model}
          readonly={readonly}
          slots={{ root: { className: textboxWidth } }}
          extensions={[command]}
        />
      ) : (
        <span className={textboxWidth} />
      )}
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

const MessageBlock = ({ block, authorId, onBlockDelete }: MessageBlockProps<Block>) => {
  return block.object ? (
    <Mosaic.Container id={block.object.id}>
      <Mosaic.DraggableTile
        type={THREAD_ITEM}
        path={block.object.id}
        item={block.object}
        Component={ObjectBlockTile}
        onRemove={onBlockDelete}
      />
    </Mosaic.Container>
  ) : block.content ? (
    <TextboxBlock text={block.content} authorId={authorId} onBlockDelete={onBlockDelete} />
  ) : null;
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
