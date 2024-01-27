//
// Copyright 2023 DXOS.org
//

import { PaperPlaneRight, X } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { type ComponentPropsWithRef, type FC, forwardRef } from 'react';

import {
  Avatar,
  Button,
  type ButtonProps,
  type ThemedClassName,
  useJdenticonHref,
  useTranslation,
} from '@dxos/react-ui';
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
  (
    { authorImgSrc, authorStatus, authorId, authorName, continues = true, children, classNames, ...rootProps },
    forwardedRef,
  ) => {
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

export type MessageBlockProps<BlockValue> = {
  block: MessageEntityBlock<BlockValue>;
  onDelete?: () => void;
};

const DefaultMessageBlock = ({ block, onDelete }: MessageBlockProps<{ data?: any; text?: string }>) => {
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

export type MessageProps<BlockValue> = MessageEntity<BlockValue> & {
  onDelete?: (messageId: string, blockIndex: number) => void;
  MessageBlockComponent?: FC<MessageBlockProps<BlockValue>>;
};

export const Message = <BlockValue,>(props: MessageProps<BlockValue>) => {
  const { t, dtLocale } = useTranslation(translationKey);

  const { authorName, onDelete, blocks, id, MessageBlockComponent = DefaultMessageBlock, ...metaProps } = props;

  const firstBlock = blocks[0];
  const dt = firstBlock.timestamp ? new Date(firstBlock.timestamp) : undefined;

  return (
    <MessageMeta {...metaProps} id={id} continues>
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
          <MessageBlockComponent key={i} block={block} onDelete={onDelete && (() => onDelete(id, i))} />
        ))}
      </div>
    </MessageMeta>
  );
};

export type MessageTextboxProps = {
  onSend?: ButtonProps['onClick'];
} & Omit<MessageMetadata, 'id' | 'authorStatus'> &
  TextEditorProps;

export const MessageTextbox = ({ onSend, authorId, authorName, authorImgSrc, ...editorProps }: MessageTextboxProps) => {
  // TODO(thure): Handle `onSend`.
  return (
    <MessageMeta
      {...{ id: editorProps.model.id, authorId, authorName, authorImgSrc }}
      authorStatus='active'
      continues={false}
    >
      <TextEditor slots={{ root: { className: mx('plb-1 mie-1 rounded-sm', focusRing) } }} {...editorProps} />
      <Button onClick={onSend}>
        <PaperPlaneRight />
      </Button>
    </MessageMeta>
  );
};
