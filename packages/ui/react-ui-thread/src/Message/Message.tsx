//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { type ComponentPropsWithRef, type FC, forwardRef } from 'react';

import { Avatar, Button, type ThemedClassName, useJdenticonHref, useTranslation } from '@dxos/react-ui';
import { TextEditor, type TextEditorProps } from '@dxos/react-ui-editor';
import {
  focusRing,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/react-ui-theme';

import { translationKey } from '../translations';
import { type MessageEntity, type MessageEntityBlock, type MessageMetadata } from '../types';

const avatarSize = 7;

const messageCell = 'plb-1 bg-[var(--surface-bg)] border-[color:var(--surface-separator)] border-bs border-be';

const safeParseJson = (data: string) => {
  try {
    return JSON.parse(data);
  } catch (err) {
    return data;
  }
};

export type MessageMetaProps = ThemedClassName<ComponentPropsWithRef<'div'>> &
  MessageMetadata &
  Partial<{ continues: boolean }>;

export const MessageMeta = forwardRef<HTMLDivElement, MessageMetaProps>(
  ({ authorImgSrc, authorStatus, authorId, continues = true, children, classNames, ...rootProps }, forwardedRef) => {
    const jdenticon = useJdenticonHref(authorId ?? '', avatarSize);

    return (
      <div role='none' {...rootProps} className={mx('contents attention-within', classNames)} ref={forwardedRef}>
        <Avatar.Root status={authorStatus ?? 'inactive'} size={avatarSize}>
          <div role='none' className={'flex flex-col items-center gap-2 ' + messageCell}>
            <Avatar.Frame>
              <Avatar.Fallback href={jdenticon} />
              {authorImgSrc && <Avatar.Image href={authorImgSrc} />}
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

export type MessageBlockProps = { block: MessageEntityBlock; onDelete?: () => void };

const MessageBlock = ({ block, onDelete }: MessageBlockProps) => {
  return (
    <div role='none' className={mx('contents', hoverableControls, hoverableFocusedWithinControls)}>
      {block.data ? (
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

export type MessageProps = MessageEntity & {
  onDelete?: (messageId: string, blockIndex: number) => void;
  MessageBlockComponent?: FC<MessageBlockProps>;
};

export const Message = (props: MessageProps) => {
  const { t, dtLocale } = useTranslation(translationKey);

  const { authorName, onDelete, blocks, id, MessageBlockComponent = MessageBlock } = props;

  const firstBlock = blocks[0];
  const dt = firstBlock.timestamp ? new Date(firstBlock.timestamp) : undefined;

  return (
    <MessageMeta {...props} continues>
      <p className='grid grid-cols-[1fr_max-content] gap-2 pie-2'>
        <Avatar.Label classNames={['truncate font-semibold', !authorName && 'fg-description']}>
          {authorName ?? t('anonymous label')}
        </Avatar.Label>
        <time className='fg-description text-xs pbs-1' dateTime={dt?.toISOString()}>
          {dt ? formatDistanceToNow(dt, { locale: dtLocale, addSuffix: true }) : ''}
        </time>
      </p>
      <div role='none' className={onDelete ? 'grid grid-cols-[1fr_max-content] gap-y-1' : 'grid grid-cols-1 gap-y-1'}>
        {blocks.map((block, i) => (
          <MessageBlockComponent
            key={block.object?.id ?? i}
            block={block}
            onDelete={onDelete && (() => onDelete(id, i))}
          />
        ))}
      </div>
    </MessageMeta>
  );
};

export type MessageTextboxProps = {
  disposition?: 'comment' | 'message';
  onSend?: (text: string) => boolean | void;
  pending?: boolean;
} & Pick<MessageMetadata, 'id' | 'authorId' | 'authorImgSrc' | 'authorName'> &
  Pick<TextEditorProps, 'model'>;

export const MessageTextbox = (props: MessageTextboxProps) => {
  const { t } = useTranslation(translationKey);
  return (
    <MessageMeta {...props} authorStatus='active' continues={false}>
      <TextEditor
        model={props.model}
        placeholder={t(props.disposition === 'comment' ? 'comment placeholder' : 'message placeholder')}
        slots={{ root: { className: mx('plb-1 mie-1 rounded-sm', focusRing) } }}
      />
    </MessageMeta>
  );
};
