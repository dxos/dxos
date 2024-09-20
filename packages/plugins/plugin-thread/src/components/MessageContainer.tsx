//
// Copyright 2024 DXOS.org
//
import { EditorView } from '@codemirror/view';
import { Check, PencilSimple, X } from '@phosphor-icons/react';
import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { type Expando, type EchoReactiveObject } from '@dxos/echo-schema';
import { type MessageType } from '@dxos/plugin-space/types';
import { PublicKey } from '@dxos/react-client';
import { type SpaceMember } from '@dxos/react-client/echo';
import { useIdentity, type Identity } from '@dxos/react-client/halo';
import {
  Button,
  ButtonGroup,
  DensityProvider,
  Tooltip,
  useOnTransition,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, useTextEditor } from '@dxos/react-ui-editor';
import { Mosaic, type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import {
  getSize,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/react-ui-theme';
import { MessageHeading, MessageRoot } from '@dxos/react-ui-thread';
import { nonNullable } from '@dxos/util';

import { command } from './command-extension';
import { useOnEditAnalytics } from '../hooks';
import { THREAD_ITEM, THREAD_PLUGIN } from '../meta';
import { getMessageMetadata } from '../util';

const messageControlClassNames = ['p-1 min-bs-0 transition-opacity items-start', hoverableControlItem];

export const MessageContainer = ({
  message,
  members,
  onDelete,
}: {
  message: MessageType;
  members: SpaceMember[];
  onDelete?: (id: string) => void;
}) => {
  const senderIdentity = members.find(
    (member) => message.sender.identityKey && PublicKey.equals(member.identity.identityKey, message.sender.identityKey),
  )?.identity;
  const messageMetadata = getMessageMetadata(message.id, senderIdentity);
  const userIsAuthor = useIdentity()?.identityKey.toHex() === messageMetadata.authorId;
  const [editing, setEditing] = useState(false);
  const handleDelete = useCallback(() => onDelete?.(message.id), [message, onDelete]);
  const { t } = useTranslation(THREAD_PLUGIN);
  const editLabel = t(editing ? 'save message label' : 'edit message label');
  const deleteLabel = t('delete message label');

  return (
    <MessageRoot {...messageMetadata} classNames={[hoverableControls, hoverableFocusedWithinControls]}>
      <MessageHeading authorName={messageMetadata.authorName} timestamp={messageMetadata.timestamp}>
        <ButtonGroup classNames='mie-1'>
          {userIsAuthor && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  variant='ghost'
                  data-testid={editing ? 'thread.message.save' : 'thread.message.edit'}
                  classNames={messageControlClassNames}
                  onClick={() => setEditing((editing) => !editing)}
                >
                  <span className='sr-only'>{editLabel}</span>
                  {editing ? <Check className={getSize(4)} /> : <PencilSimple className={getSize(4)} />}
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content classNames='z-[21]'>
                  {editLabel}
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
          {onDelete && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  variant='ghost'
                  data-testid='thread.message.delete'
                  classNames={messageControlClassNames}
                  onClick={() => handleDelete()}
                >
                  <span className='sr-only'>{deleteLabel}</span>
                  <X className={getSize(4)} />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content classNames='z-[21]'>
                  {deleteLabel}
                  <Tooltip.Arrow />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
        </ButtonGroup>
      </MessageHeading>
      <TextboxBlock message={message} isAuthor={userIsAuthor} editing={editing} />
      {message.parts?.filter(nonNullable).map((part, index) => <MessagePart key={index} part={part} />)}
    </MessageRoot>
  );
};

const MessagePart = ({ part }: { part: Expando }) => {
  return (
    <Mosaic.Container id={part.id}>
      <Mosaic.DraggableTile type={THREAD_ITEM} path={part.id} item={part} Component={MessageBlockObjectTile} />
    </Mosaic.Container>
  );
};

const TextboxBlock = ({
  message,
  isAuthor,
  editing,
}: {
  message: MessageType;
  editing?: boolean;
  isAuthor?: boolean;
  identity?: Identity;
}) => {
  const { themeMode } = useThemeContext();
  const inMemoryContentRef = useRef(message.text);

  const handleDocumentChange = useCallback((newState: string) => {
    inMemoryContentRef.current = newState;
  }, []);

  const saveDocumentChange = useCallback(() => {
    message.text = inMemoryContentRef.current;
  }, [message]);

  useOnTransition(editing, true, false, saveDocumentChange);

  const { parentRef, focusAttributes, view } = useTextEditor(
    () => ({
      initialValue: message.text,
      extensions: [
        createBasicExtensions({ readonly: !isAuthor || !editing }),
        createThemeExtensions({ themeMode }),
        command,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleDocumentChange(update.state.doc.toString());
          }
        }),
      ],
    }),
    [message.text, editing, isAuthor, themeMode, handleDocumentChange],
  );

  useEffect(() => {
    editing && view?.focus();
  }, [editing, view]);

  useOnEditAnalytics(message, !!editing);

  return <div role='none' ref={parentRef} className='mie-4' {...focusAttributes} />;
};

const MessageBlockObjectTile: MosaicTileComponent<EchoReactiveObject<any>> = forwardRef(
  ({ draggableStyle, draggableProps, item, active, ...props }, forwardedRef) => {
    let title = item.name ?? item.title ?? item.__typename ?? 'Object';
    if (typeof title !== 'string') {
      title = title?.content ?? '';
    }

    return (
      <div
        role='group'
        className={mx('grid col-span-3 py-1 pr-4', hoverableControls, hoverableFocusedWithinControls)}
        style={draggableStyle}
        ref={forwardedRef}
      >
        <DensityProvider density='fine'>
          <Surface
            role='card'
            limit={1}
            data={{ content: item }}
            draggableProps={draggableProps}
            fallback={title}
            {...props}
          />
        </DensityProvider>
      </div>
    );
  },
);
