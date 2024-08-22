//
// Copyright 2023 DXOS.org
//

import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { type ComponentPropsWithRef, forwardRef, useMemo, type ComponentPropsWithoutRef } from 'react';

// TODO(burdon): Remove dep.
import { Avatar, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type UseTextEditorProps, keymap, listener, useTextEditor } from '@dxos/react-ui-editor';
import { focusRing, mx } from '@dxos/react-ui-theme';
import { hexToEmoji, hexToHue, isNotFalsy } from '@dxos/util';

import { translationKey } from '../translations';
import { type MessageMetadata } from '../types';

const avatarSize = 7;

export type MessageRootProps = ThemedClassName<ComponentPropsWithRef<'div'>> &
  MessageMetadata &
  Partial<{ continues: boolean }>;

export const MessageRoot = forwardRef<HTMLDivElement, MessageRootProps>(
  (
    { authorImgSrc, authorId, authorName, authorAvatarProps, continues = true, children, classNames, ...rootProps },
    forwardedRef,
  ) => {
    return (
      // Must wrap the message since Avatar.Label may be used in the content.
      <Avatar.Root size={avatarSize} hue={authorAvatarProps?.hue || hexToHue(authorId ?? '0')}>
        <div
          role='none'
          data-testid='thread.message'
          {...rootProps}
          className={mx('grid grid-cols-subgrid col-span-2', classNames)}
          ref={forwardedRef}
        >
          <div role='none' className='flex flex-col items-center gap-2 pbs-2'>
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
    <Avatar.Label classNames='block truncate text-sm fg-subdued'>{authorName ?? t('anonymous label')}</Avatar.Label>
  );
};

export type MessageTimeProps = Pick<MessageMetadata, 'timestamp'>;

export const MessageTime = ({ timestamp }: MessageTimeProps) => {
  const { dtLocale } = useTranslation(translationKey);
  const dt = timestamp ? new Date(timestamp) : undefined;
  return (
    <time className='block fg-subdued text-xs pbe-0.5' dateTime={dt?.toISOString()}>
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
  const extensions = useMemo<UseTextEditorProps['extensions']>(() => {
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

  const { parentRef, focusAttributes } = useTextEditor(() => ({ id, extensions, ...editorProps }), [id, extensions]);

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
