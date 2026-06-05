//
// Copyright 2023 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, {
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Obj, Ref } from '@dxos/echo';
import {
  Avatar,
  IconButton,
  type ThemedClassName,
  useOnTransition,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { type UseTextEditorProps, useTextEditor } from '@dxos/react-ui-editor';
import { type ContentBlock, type Message as MessageType } from '@dxos/types';
import { createBasicExtensions, createThemeExtensions, keymap, listener } from '@dxos/ui-editor';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';
import { hexToEmoji, hexToHue, isTruthy } from '@dxos/util';

import { command } from '../command';
import { useThreadContext } from '../context';
import { translationKey } from '../translations';
import { type MessageMetadata } from '../types';

const avatarSize = 7;

const buttonGroupClassNames = 'flex flex-row items-center gap-0.5 pe-2';
const buttonClassNames = 'p-1! transition-opacity';

//
// Root
//

export type MessageRootProps = ThemedClassName<
  ComponentPropsWithRef<'div'> & MessageMetadata & Partial<{ continues: boolean; controls: ReactNode }>
>;

// TODO(burdon): Show authorName on tooltip.
const MessageRoot = forwardRef<HTMLDivElement, MessageRootProps>(
  (
    {
      authorImgSrc,
      authorId,
      authorName,
      authorAvatarProps,
      continues = true,
      controls,
      children,
      classNames,
      ...rootProps
    },
    forwardedRef,
  ) => {
    // Must wrap the message since Avatar.Label may be used in the content.
    // Columns mirror Thread.Header (avatar/rail · content · controls) so trailing
    // controls align with the thread header's controls.
    return (
      <Avatar.Root>
        <div
          data-testid='thread.message'
          {...rootProps}
          className={mx('grid grid-cols-[var(--dx-rail-size)_1fr_min-content] w-full', classNames)}
          ref={forwardedRef}
        >
          <div className='flex flex-col items-center gap-2 pt-1'>
            <Avatar.Content
              size={avatarSize}
              hue={authorAvatarProps?.hue || hexToHue(authorId ?? '0')}
              fallback={authorAvatarProps?.emoji || hexToEmoji(authorId ?? '0')}
              {...(authorImgSrc && { imgSrc: authorImgSrc })}
            />
            {continues && <div className='w-px grow bg-separator' />}
          </div>
          <div className='py-1 min-w-0'>{children}</div>
          {controls && <div className='self-start'>{controls}</div>}
        </div>
      </Avatar.Root>
    );
  },
);

MessageRoot.displayName = 'Message.Root';

//
// Heading
//

export type MessageHeadingProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> &
  Pick<MessageMetadata, 'authorName' | 'timestamp'>;

const MessageHeading = ({ children, classNames, timestamp, authorName, ...props }: MessageHeadingProps) => {
  return (
    <div {...props} className={mx('flex gap-2 items-start', classNames)}>
      <p className='grow'>
        <MessageAuthorName authorName={authorName} />
        {timestamp && <MessageTime timestamp={timestamp} />}
      </p>
      {children}
    </div>
  );
};

MessageHeading.displayName = 'Message.Heading';

export type MessageAuthorNameProps = Pick<MessageMetadata, 'authorName'>;

const MessageAuthorName = ({ authorName }: MessageAuthorNameProps) => {
  const { t } = useTranslation(translationKey);
  return (
    <Avatar.Label classNames='block truncate text-sm text-subdued'>{authorName ?? t('anonymous.label')}</Avatar.Label>
  );
};

MessageAuthorName.displayName = 'Message.AuthorName';

export type MessageTimeProps = Pick<MessageMetadata, 'timestamp'>;

const MessageTime = ({ timestamp }: MessageTimeProps) => {
  const { dtLocale } = useTranslation(translationKey);
  const dt = timestamp ? new Date(timestamp) : undefined;
  return (
    <time className='block text-subdued text-xs pb-0.5' dateTime={dt?.toISOString()}>
      {dt ? formatDistanceToNow(dt, { locale: dtLocale, addSuffix: true }) : ''}
    </time>
  );
};

MessageTime.displayName = 'Message.Time';

//
// Body
//

export type MessageBodyProps = {
  /** The message whose content blocks are rendered. */
  message: MessageType.Message;
  /** When true, the local user authored this message. */
  isAuthor?: boolean;
  /** When true, the text block is editable. */
  editing?: boolean;
  /** Persist an edited text block. */
  onSave?: (text: string) => void;
};

/**
 * Renders a message's content blocks: text (via editor), proposal, and
 * object/reference tiles (delegated to the injected `Object` component).
 */
const MessageBody = ({ message, isAuthor, editing, onSave }: MessageBodyProps) => {
  const { components } = useThreadContext('Message.Body');
  const textBlockIndex = message.blocks.findIndex((block) => block._tag === 'text');
  const textBlock = textBlockIndex !== -1 ? (message.blocks[textBlockIndex] as ContentBlock.Text) : undefined;
  const proposalBlock = message.blocks.find((block) => block._tag === 'proposal') as ContentBlock.Proposal | undefined;
  const references = message.blocks
    .filter((block) => block._tag === 'reference')
    .map((block) => (block as ContentBlock.Reference).reference);
  const Object = components.Object;

  return (
    <>
      {textBlock && <TextBlock block={textBlock} isAuthor={isAuthor} editing={editing} onSave={onSave} />}
      {proposalBlock && <div className='me-4 italic'>{proposalBlock.text}</div>}
      {Object &&
        Ref.Array.targets(references).map((reference, index) => (
          <Object key={index} subject={reference as Obj.Unknown} />
        ))}
    </>
  );
};

MessageBody.displayName = 'Message.Body';

const TextBlock = ({
  block,
  isAuthor,
  editing,
  onSave,
}: {
  block: ContentBlock.Text;
  isAuthor?: boolean;
  editing?: boolean;
  onSave?: (text: string) => void;
}) => {
  const { themeMode } = useThemeContext();
  const inMemoryContentRef = useRef(block.text);

  const handleDocumentChange = useCallback((next: string) => {
    inMemoryContentRef.current = next;
  }, []);

  const saveDocumentChange = useCallback(() => {
    onSave?.(inMemoryContentRef.current);
  }, [onSave]);

  useOnTransition(editing, true, false, saveDocumentChange);

  const { parentRef, focusAttributes, view } = useTextEditor(
    () => ({
      initialValue: block.text,
      extensions: [
        createBasicExtensions({ readOnly: !isAuthor || !editing }),
        createThemeExtensions({ themeMode }),
        command,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleDocumentChange(update.state.doc.toString());
          }
        }),
      ],
    }),
    [block.text, editing, isAuthor, themeMode, handleDocumentChange],
  );

  useEffect(() => {
    if (editing) {
      view?.focus();
    }
  }, [editing, view]);

  return <div ref={parentRef} className='me-4' {...focusAttributes} />;
};

//
// Textbox
//

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
      }
      return false;
    },
  },
  {
    key: 'Meta+Backspace',
    run: () => {
      if (onClear) {
        onClear();
        return true;
      }
      return false;
    },
  },
];

const MessageTextbox = ({
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
        ref={parentRef}
        className={mx('py-0.5 me-1 rounded-xs dx-focus-ring', disabled && 'opacity-50')}
        {...focusAttributes}
      />
    </MessageRoot>
  );
};

MessageTextbox.displayName = 'Message.Textbox';

//
// Tile
//

export type MessageTileProps = {
  message: MessageType.Message;
  classNames?: MessageRootProps['classNames'];
};

/**
 * Full message tile (frame + heading + controls + body). Reads `Thread.Root`
 * context for metadata resolution, injected renderers, and callbacks. This is
 * the unit rendered by `Thread.Messages`.
 */
const MessageTile = ({ message, classNames }: MessageTileProps) => {
  const { t } = useTranslation(translationKey);
  const { getMetadata, identityDid, editable, onMessageDelete, onAcceptProposal } = useThreadContext('Message.Tile');
  const [editing, setEditing] = useState(false);

  const metadata = getMetadata(message);
  const isAuthor = !!identityDid && identityDid === metadata.authorId;
  const hasProposal = message.blocks.some((block) => block._tag === 'proposal');

  const handleEdit = useCallback(() => setEditing((value) => !value), []);
  const handleDelete = useCallback(() => onMessageDelete?.(message.id), [onMessageDelete, message.id]);
  const handleAcceptProposal = useCallback(() => onAcceptProposal?.(message.id), [onAcceptProposal, message.id]);
  const handleSave = useCallback(
    (text: string) => {
      Obj.update(message, (message) => {
        const block = message.blocks.find((block) => block._tag === 'text');
        if (block && block._tag === 'text') {
          block.text = text;
        }
      });
    },
    [message],
  );

  const showEdit = isAuthor && editable;
  const showAccept = hasProposal && !!onAcceptProposal;
  const showDelete = !!onMessageDelete;
  const controls =
    showEdit || showAccept || showDelete ? (
      <div className={buttonGroupClassNames}>
        {showEdit && (
          <IconButton
            data-testid={editing ? 'thread.message.save' : 'thread.message.edit'}
            variant='ghost'
            icon={editing ? 'ph--check--regular' : 'ph--pencil-simple--regular'}
            iconOnly
            label={t(editing ? 'save-message.label' : 'edit-message.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleEdit}
          />
        )}
        {showAccept && (
          <IconButton
            data-testid='thread.message.accept'
            variant='ghost'
            icon='ph--check--regular'
            iconOnly
            label={t('accept-proposal.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleAcceptProposal}
          />
        )}
        {showDelete && (
          <IconButton
            data-testid='thread.message.delete'
            variant='ghost'
            icon='ph--x--regular'
            iconOnly
            label={t('delete-message.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleDelete}
          />
        )}
      </div>
    ) : undefined;

  return (
    <MessageRoot
      {...metadata}
      controls={controls}
      classNames={[hoverableControls, hoverableFocusedWithinControls, classNames]}
    >
      <MessageHeading authorName={metadata.authorName} timestamp={metadata.timestamp} />
      <MessageBody message={message} isAuthor={isAuthor} editing={editing} onSave={handleSave} />
    </MessageRoot>
  );
};

MessageTile.displayName = 'Message.Tile';

//
// Message
//

export const Message = {
  Root: MessageRoot,
  Heading: MessageHeading,
  AuthorName: MessageAuthorName,
  Time: MessageTime,
  Body: MessageBody,
  Textbox: MessageTextbox,
  Tile: MessageTile,
};
