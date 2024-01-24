//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { forwardRef, useId } from 'react';

import { type Message as MessageType } from '@braneframe/types';
import { PublicKey } from '@dxos/react-client';
import { type Expando, getTextContent } from '@dxos/react-client/echo';
import { Avatar, Button, useJdenticonHref, useTranslation } from '@dxos/react-ui';
import { Mosaic, type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { hoverableControlItem, hoverableControls, mx } from '@dxos/react-ui-theme';

import { THREAD_ITEM, THREAD_PLUGIN } from '../../meta';
import { type MessagePropertiesProvider, safeParseJson } from '../util';

export type MessageCardProps = {
  message: MessageType;
  propertiesProvider?: MessagePropertiesProvider;
  onDelete?: (messageId: string, idx: number) => void;
};

const avatarSize = 7;

export const Message = ({ message, propertiesProvider, onDelete }: MessageCardProps) => {
  const { t, dtLocale } = useTranslation(THREAD_PLUGIN);
  const jdenticon = useJdenticonHref(message.from.identityKey ?? '', avatarSize);

  if (!message.blocks.length) {
    return null;
  }

  const firstBlock = message.blocks[0]!;
  const { displayName, profileImgSrc, status } =
    propertiesProvider?.(message.from?.identityKey ? PublicKey.from(message.from?.identityKey) : undefined) ?? {};
  const dt = firstBlock.timestamp ? new Date(firstBlock.timestamp) : undefined;

  return (
    <Avatar.Root status={status ?? 'inactive'} size={avatarSize}>
      <div role='none' className='flex flex-col items-center gap-2'>
        <Avatar.Frame>
          <Avatar.Fallback href={message.from.identityKey ? jdenticon : ''} />
          {profileImgSrc && <Avatar.Image href={profileImgSrc} />}
        </Avatar.Frame>
        <div role='none' className='is-px grow surface-separator' />
      </div>
      <div role='none'>
        <p className='grid grid-cols-[1fr_max-content] gap-2'>
          <Avatar.Label classNames={['truncate font-semibold', !displayName && 'fg-description']}>
            {displayName ?? t('anonymous label')}
          </Avatar.Label>
          <span className='fg-description text-xs'>
            {dt ? formatDistanceToNow(dt, { locale: dtLocale, addSuffix: true }) : ''}
          </span>
        </p>
        <div role='none' className={onDelete ? 'grid grid-cols-[1fr_max-content]' : 'grid grid-cols-1'}>
          {message.blocks.map((block, i) => (
            <MessageBlock
              key={block.object?.id ?? i}
              block={block}
              onDelete={onDelete && (() => onDelete(message.id, i))}
            />
          ))}
        </div>
      </div>
    </Avatar.Root>
  );
};

const MessageBlock = ({ block, onDelete }: { block: MessageType.Block; onDelete?: () => void }) => {
  const id = useId();

  return (
    <div role='none' className={mx('contents', hoverableControls)}>
      {block.object ? (
        <Mosaic.Container id={id} Component={MessageObjectBlock}>
          <Mosaic.DraggableTile
            type={THREAD_ITEM}
            path={id}
            item={block.object}
            Component={MessageObjectBlock}
            onRemove={onDelete}
          />
        </Mosaic.Container>
      ) : block.data ? (
        // TODO(burdon): Render via CM editor in readonly.
        <pre className='font-mono'>
          <code>{JSON.stringify(safeParseJson(block.data), undefined, 2)}</code>
        </pre>
      ) : (
        <p>{block.text ?? ''}</p>
      )}
      {onDelete && (
        <Button variant='ghost' classNames={['p-1', hoverableControlItem]} onClick={onDelete}>
          <X />
        </Button>
      )}
    </div>
  );
};

// TODO(burdon): Reuse SearchResult component?
const MessageObjectBlock: MosaicTileComponent<Expando> = forwardRef(
  ({ draggableStyle, draggableProps, item }, forwardRef) => {
    let title = item.name ?? item.title ?? item.__typename ?? 'Object';
    if (typeof title !== 'string') {
      title = getTextContent(title);
    }

    return (
      <div ref={forwardRef} style={draggableStyle} className='grid grid-cols-[min-content_1fr]'>
        <Button variant='ghost' {...draggableProps}>
          <DotsSixVertical />
        </Button>
        <p>{title}</p>
      </div>
    );
  },
);
