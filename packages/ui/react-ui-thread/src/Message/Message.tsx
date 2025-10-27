//
// Copyright 2023 DXOS.org
//

import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { type ComponentPropsWithRef, type ComponentPropsWithoutRef, forwardRef } from 'react';

// TODO(burdon): Remove dep.
import { Avatar, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type UseTextEditorProps, keymap, listener, useTextEditor } from '@dxos/react-ui-editor';
import { focusRing, mx } from '@dxos/react-ui-theme';
import { hexToEmoji, hexToHue, isTruthy } from '@dxos/util';

import { translationKey } from '../translations';
import { type MessageMetadata } from '../types';

const avatarSize = 7;

export type MessageRootProps = ThemedClassName<ComponentPropsWithRef<'div'>> &
  MessageMetadata &
  Partial<{ continues: boolean }>;

// TODO(burdon): Show authorName on tooltip.
export const MessageRoot = forwardRef<HTMLDivElement, MessageRootProps>(
  (
    { authorImgSrc, authorId, authorName, authorAvatarProps, continues = true, children, classNames, ...rootProps },
    forwardedRef,
  ) => {
    return (
      // Must wrap the message since Avatar.Label may be used in the content.
      <Avatar.Root>
        <div
          role='none'
          data-testid='thread.message'
          {...rootProps}
          className={mx('grid grid-cols-subgrid col-span-2', classNames)}
          ref={forwardedRef}
        >
          <div role='none' className='flex flex-col items-center gap-2 pbs-1'>
            <Avatar.Content
              size={avatarSize}
              hue={authorAvatarProps?.hue || hexToHue(authorId ?? '0')}
              fallback={authorAvatarProps?.emoji || hexToEmoji(authorId ?? '0')}
              {...(authorImgSrc && { imgSrc: authorImgSrc })}
            />
            {continues && <div role='none' className='is-px grow bg-separator' />}
          </div>
          <div role='none' className='plb-1 min-is-0'>
            {children}
          </div>
        </div>
      </Avatar.Root>
    );
  },
);

export type MessageHeadingProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> &
  Pick<MessageMetadata, 'authorName' | 'timestamp'>;

export const MessageHeading = ({ children, classNames, timestamp, authorName, ...props }: MessageHeadingProps) => {
  return (
    <div role='none' {...props} className={mx('flex gap-2 items-start', classNames)}>
      <p className='grow'>
        <MessageAuthorName authorName={authorName} />
        {timestamp && <MessageTime timestamp={timestamp} />}
      </p>
      {children}
    </div>
  );
};

export type MessageAuthorNameProps = Pick<MessageMetadata, 'authorName'>;

export const MessageAuthorName = ({ authorName }: MessageAuthorNameProps) => {
  const { t } = useTranslation(translationKey);
  return (
    <Avatar.Label classNames='block truncate text-sm text-subdued'>{authorName ?? t('anonymous label')}</Avatar.Label>
  );
};

export type MessageTimeProps = Pick<MessageMetadata, 'timestamp'>;

export const MessageTime = ({ timestamp }: MessageTimeProps) => {
  const { dtLocale } = useTranslation(translationKey);
  const dt = timestamp ? new Date(timestamp) : undefined;
  return (
    <time className='block text-subdued text-xs pbe-0.5' dateTime={dt?.toISOString()}>
      {dt ? formatDistanceToNow(dt, { locale: dtLocale, addSuffix: true }) : ''}
    </time>
  );
};

export type MessageBodyProps = ComponentPropsWithoutRef<'p'>;

export const MessageBody = ({ children, ...props }: MessageBodyProps) => {
  return <p {...props}>{children}</p>;
};

export type MessageTextboxProps = {
  disabled?: boolean;
  onSend?: () => void;
  onClear?: () => void;
  onEditorFocus?: () => void;
} & MessageMetadata &
  UseTextEditorProps;

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
  authorId,
  authorName,
  authorImgSrc,
  authorAvatarProps,
  disabled,
  extensions,
  onSend,
  onClear,
  onEditorFocus,
  ...editorProps
}: MessageTextboxProps) => {
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      id,
      extensions: [
        keymap.of(keyBindings({ onSend, onClear })),
        listener({
          onFocus: ({ focusing }) => {
            if (focusing) {
              onEditorFocus?.();
            }
          },
        }),
        extensions,
      ].filter(isTruthy),
      ...editorProps,
    }),
    [id, extensions],
  );

  return (
    <MessageRoot {...{ id, authorId, authorName, authorImgSrc, authorAvatarProps }} continues={false}>
      <div
        role='none'
        ref={parentRef}
        className={mx('plb-0.5 mie-1 rounded-sm', focusRing, disabled && 'opacity-50')}
        {...focusAttributes}
      />
    </MessageRoot>
  );
};
