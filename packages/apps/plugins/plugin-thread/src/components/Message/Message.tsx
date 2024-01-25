//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { type ComponentPropsWithRef, forwardRef, useId } from 'react';

import { type Message as MessageType } from '@braneframe/types';
import { PublicKey } from '@dxos/react-client';
import { type Expando, getTextContent } from '@dxos/react-client/echo';
import { Avatar, Button, type ThemedClassName, useJdenticonHref, useTranslation } from '@dxos/react-ui';
import { TextEditor, type TextEditorProps } from '@dxos/react-ui-editor';
import { Mosaic, type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import {
  focusRing,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/react-ui-theme';

import { THREAD_ITEM, THREAD_PLUGIN } from '../../meta';
import { type MessageProperties, type MessagePropertiesProvider, safeParseJson } from '../util';

export type MessageMetaProps = ThemedClassName<ComponentPropsWithRef<'div'>> &
  MessageProperties &
  Partial<{ fromIdentityKey: string; continues: boolean }>;

export type ThreadProps = {
  message: MessageType;
  propertiesProvider?: MessagePropertiesProvider;
  onDelete?: (messageId: string, idx: number) => void;
};

const avatarSize = 7;

const messageCell = 'plb-1 bg-[var(--surface-bg)] border-[color:var(--surface-separator)] border-bs border-be';

export const MessageMeta = forwardRef<HTMLDivElement, MessageMetaProps>(
  ({ profileImgSrc, status, fromIdentityKey, continues = true, children, classNames, ...rootProps }, forwardedRef) => {
    const jdenticon = useJdenticonHref(fromIdentityKey ?? '', avatarSize);

    return (
      <div role='none' {...rootProps} className={mx('contents attention-within', classNames)} ref={forwardedRef}>
        <Avatar.Root status={status ?? 'inactive'} size={avatarSize}>
          <div role='none' className={'flex flex-col items-center gap-2 ' + messageCell}>
            <Avatar.Frame>
              <Avatar.Fallback href={fromIdentityKey ? jdenticon : ''} />
              {profileImgSrc && <Avatar.Image href={profileImgSrc} />}
            </Avatar.Frame>
            {continues && <div role='none' className='is-px grow surface-separator' />}
          </div>
          <div role='none' className={messageCell}>
            {children}
          </div>
        </Avatar.Root>
      </div>
    );
  },
);

const MessageBlock = ({ block, onDelete }: { block: MessageType.Block; onDelete?: () => void }) => {
  const id = useId();

  return (
    <div role='none' className={mx('contents', hoverableControls, hoverableFocusedWithinControls)}>
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
        <Button
          variant='ghost'
          classNames={['p-1 min-bs-0 mie-1 place-self-start transition-opacity', hoverableControlItem]}
          onClick={onDelete}
        >
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
      <p className='grid grid-cols-[1fr_max-content] gap-2 pie-2'>
        <Avatar.Label classNames={['truncate font-semibold', !messageProperties.displayName && 'fg-description']}>
          {messageProperties.displayName ?? t('anonymous label')}
        </Avatar.Label>
        <time className='fg-description text-xs pbs-1' dateTime={dt?.toISOString()}>
          {dt ? formatDistanceToNow(dt, { locale: dtLocale, addSuffix: true }) : ''}
        </time>
      </p>
      <div role='none' className={onDelete ? 'grid grid-cols-[1fr_max-content] gap-y-1' : 'grid grid-cols-1 gap-y-1'}>
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
} & Pick<MessageProperties, 'profileImgSrc' | 'displayName'> &
  Pick<TextEditorProps, 'model'>;

export const MessageTextbox = ({
  asIdentityKey,
  profileImgSrc,
  displayName,
  disposition,
  model,
}: MessageTextboxProps) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  return (
    <MessageMeta
      status='active'
      fromIdentityKey={asIdentityKey}
      profileImgSrc={profileImgSrc}
      displayName={displayName}
      continues={false}
    >
      <TextEditor
        model={model}
        placeholder={t(disposition === 'comment' ? 'comment placeholder' : 'message placeholder')}
        slots={{ root: { className: mx('plb-1 mie-1 rounded-sm', focusRing) } }}
      />
    </MessageMeta>
  );
};
