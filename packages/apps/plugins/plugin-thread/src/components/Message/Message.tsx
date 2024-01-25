//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { forwardRef, type PropsWithChildren, useId } from 'react';

import { type Message as MessageType } from '@braneframe/types';
import { PublicKey } from '@dxos/react-client';
import { type Expando, getTextContent } from '@dxos/react-client/echo';
import { Avatar, Button, Input, useJdenticonHref, useTranslation } from '@dxos/react-ui';
import { Mosaic, type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { hoverableControlItem, hoverableControls, mx } from '@dxos/react-ui-theme';

import { THREAD_ITEM, THREAD_PLUGIN } from '../../meta';
import { type MessageProperties, type MessagePropertiesProvider, safeParseJson } from '../util';

export type MessageMetaProps = PropsWithChildren<
  MessageProperties & Partial<{ fromIdentityKey: string; continues: boolean }>
>;

export type ThreadProps = {
  message: MessageType;
  propertiesProvider?: MessagePropertiesProvider;
  onDelete?: (messageId: string, idx: number) => void;
};

const avatarSize = 7;

export const MessageMeta = ({
  profileImgSrc,
  status,
  fromIdentityKey,
  continues = true,
  children,
}: MessageMetaProps) => {
  const jdenticon = useJdenticonHref(fromIdentityKey ?? '', avatarSize);

  return (
    <div role='none' className='contents attention-within'>
      <Avatar.Root status={status ?? 'inactive'} size={avatarSize}>
        <div
          role='none'
          className='flex flex-col items-center gap-2 bg-[var(--surface-bg)] border-[color:var(--surface-separator)] border-bs border-be'
        >
          <Avatar.Frame>
            <Avatar.Fallback href={fromIdentityKey ? jdenticon : ''} />
            {profileImgSrc && <Avatar.Image href={profileImgSrc} />}
          </Avatar.Frame>
          {continues && <div role='none' className='is-px grow surface-separator' />}
        </div>
        <div role='none' className='bg-[var(--surface-bg)] border-[color:var(--surface-separator)] border-bs border-be'>
          {children}
        </div>
      </Avatar.Root>
    </div>
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
      <div role='none' ref={forwardRef} style={draggableStyle} className='grid grid-cols-[min-content_1fr]'>
        <Button variant='ghost' {...draggableProps}>
          <DotsSixVertical />
        </Button>
        <p>{title}</p>
      </div>
    );
  },
);

export const Message = ({ message, propertiesProvider, onDelete }: ThreadProps) => {
  const { t, dtLocale } = useTranslation(THREAD_PLUGIN);

  const fromIdentityKey = message.from?.identityKey;
  const firstBlock = message.blocks[0]!;

  const messageProperties = propertiesProvider?.(fromIdentityKey ? PublicKey.from(fromIdentityKey) : undefined) ?? {};

  const dt = firstBlock.timestamp ? new Date(firstBlock.timestamp) : undefined;

  return (
    <MessageMeta {...messageProperties} fromIdentityKey={fromIdentityKey} continues>
      <p className='grid grid-cols-[1fr_max-content] gap-2'>
        <Avatar.Label classNames={['truncate font-semibold', !messageProperties.displayName && 'fg-description']}>
          {messageProperties.displayName ?? t('anonymous label')}
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
    </MessageMeta>
  );
};

export type MessageTextboxProps = {
  asIdentityKey: string;
  disposition?: 'comment' | 'message';
  onSend?: (text: string) => boolean | void;
  pending?: boolean;
} & Pick<MessageProperties, 'profileImgSrc' | 'displayName'>;

export const MessageTextbox = ({ asIdentityKey, profileImgSrc, displayName, disposition }: MessageTextboxProps) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  // TODO(thure): Refactor to use TextEditor.
  return (
    <Input.Root>
      <MessageMeta
        status='active'
        fromIdentityKey={asIdentityKey}
        profileImgSrc={profileImgSrc}
        displayName={displayName}
        continues={false}
      >
        <Input.Label srOnly>{t(disposition === 'comment' ? 'comment placeholder' : 'message placeholder')}</Input.Label>
        <Input.TextInput placeholder={t(disposition === 'comment' ? 'comment placeholder' : 'message placeholder')} />
      </MessageMeta>
    </Input.Root>
  );
};
