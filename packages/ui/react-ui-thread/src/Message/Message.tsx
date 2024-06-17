//
// Copyright 2023 DXOS.org
//

import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { type ComponentPropsWithRef, forwardRef, useMemo, type PropsWithChildren } from 'react';

// TODO(burdon): Remove dep.
import { Avatar, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type TextEditorProps, keymap, listener, TextEditor } from '@dxos/react-ui-editor';
import { focusRing, mx } from '@dxos/react-ui-theme';
import { hexToEmoji, hexToHue, isNotFalsy } from '@dxos/util';

import { translationKey } from '../translations';
import { type MessageMetadata } from '../types';

const avatarSize = 7;

export type MessageMetaProps = ThemedClassName<ComponentPropsWithRef<'div'>> &
  MessageMetadata &
  Partial<{ continues: boolean }>;

export const MessageMeta = forwardRef<HTMLDivElement, MessageMetaProps>(
  (
    { authorImgSrc, authorId, authorName, authorAvatarProps, continues = true, children, classNames, ...rootProps },
    forwardedRef,
  ) => {
    return (
      <Avatar.Root size={avatarSize} hue={authorAvatarProps?.hue || hexToHue(authorId ?? '0')}>
        <div
          role='none'
          data-testid='thread.message'
          {...rootProps}
          className={mx('grid grid-cols-subgrid col-span-2', classNames)}
          ref={forwardedRef}
        >
          <div role='none' className={mx('flex flex-col items-center gap-2 plb-2')}>
            <Avatar.Frame>
              <Avatar.Fallback text={authorAvatarProps?.emoji || hexToEmoji(authorId ?? '0')} />
              {authorImgSrc && <Avatar.Image href={authorImgSrc} />}
            </Avatar.Frame>
            {continues && <div role='none' className='is-px grow surface-separator' />}
          </div>
          <div role='none' className='plb-1 min-is-0'>
            {children}
          </div>
        </div>
      </Avatar.Root>
    );
  },
);

export type MessageProps = PropsWithChildren<MessageMetadata>;

export const Message = ({ timestamp, children, ...messageMeta }: MessageProps) => {
  const { t, dtLocale } = useTranslation(translationKey);
  const dt = timestamp ? new Date(timestamp) : undefined;

  return (
    <MessageMeta {...messageMeta} continues>
      <p className='grid grid-cols-[1fr_max-content] gap-2 pie-2'>
        <Avatar.Label classNames={['truncate text-sm font-medium', !messageMeta.authorName && 'fg-description']}>
          {messageMeta.authorName ?? t('anonymous label')}
        </Avatar.Label>
        <time className='fg-description text-xs pbs-0.5' dateTime={dt?.toISOString()}>
          {dt ? formatDistanceToNow(dt, { locale: dtLocale, addSuffix: true }) : ''}
        </time>
      </p>
      <div role='none' className='grid gap-y-1 grid-cols-[min-content_1fr_min-content]'>
        {children}
        {/* <MessageTextComponent message={message} onDelete={() => onDelete?.(message.id)} />
        {message.parts?.map((part, i) => <MessagePartComponent key={i} part={part} />)} */}
      </div>
    </MessageMeta>
  );
};

export type MessageTextboxProps = {
  disabled?: boolean;
  onSend?: () => void;
  onClear?: () => void;
  onEditorFocus?: () => void;
} & MessageMetadata &
  TextEditorProps;

const keyBindings = ({ onSend, onClear }: Pick<MessageTextboxProps, 'onSend' | 'onClear'>) => [
  {
    key: 'Enter',
    run: () => {
      if (onSend) {
        onSend();
        return true;
      } else {
        return false;
      }
    },
  },
  {
    // TODO(burdon): Other key bindings.
    key: 'Meta+Backspace',
    run: () => {
      if (onClear) {
        onClear();
        return true;
      } else {
        return false;
      }
    },
  },
];

export const MessageTextbox = ({
  id,
  onSend,
  onClear,
  onEditorFocus,
  authorId,
  authorName,
  authorImgSrc,
  authorAvatarProps,
  disabled,
  extensions: _extensions,
  ...editorProps
}: MessageTextboxProps) => {
  const extensions = useMemo<TextEditorProps['extensions']>(() => {
    return [
      keymap.of(keyBindings({ onSend, onClear })),
      listener({
        onFocus: (focusing) => {
          if (focusing) {
            onEditorFocus?.();
          }
        },
      }),
      _extensions,
    ].filter(isNotFalsy);
    // TODO(wittjosiah): Should probably include callbacks in the dependency array.
  }, [_extensions]);

  return (
    <MessageMeta {...{ id, authorId, authorName, authorImgSrc, authorAvatarProps }} continues={false}>
      <TextEditor
        {...editorProps}
        extensions={extensions}
        className={mx('plb-0.5 mie-1 rounded-sm', focusRing, disabled && 'opacity-50')}
      />
    </MessageMeta>
  );
};
