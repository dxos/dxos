//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';
import type * as Schema from 'effect/Schema';
import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { type Obj, Ref } from '@dxos/echo';
import { PublicKey } from '@dxos/react-client';
import { type SpaceMember } from '@dxos/react-client/echo';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import { IconButton, useOnTransition, useThemeContext, useTranslation } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, useTextEditor } from '@dxos/react-ui-editor';
import { MessageHeading, MessageRoot } from '@dxos/react-ui-thread';
import { type ContentBlock, type Message } from '@dxos/types';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

import { useOnEditAnalytics } from '../hooks';
import { meta } from '../meta';
import { getMessageMetadata } from '../util';

import { command } from './command-extension';

export const buttonGroupClassNames = 'flex flex-row items-center gap-0.5 pie-2';
export const buttonClassNames = '!p-1 transition-opacity';

export type MessageContainerProps = {
  // TODO(wittjosiah): Find a simpler way to define this type.
  message: Obj.Obj<Schema.Schema.Type<typeof Message.Message>>;
  members: SpaceMember[];
  editable?: boolean;
  onDelete?: (id: string) => void;
  onAcceptProposal?: (id: string) => void;
};

export const MessageContainer = ({
  message,
  members,
  editable = false,
  onDelete,
  onAcceptProposal,
}: MessageContainerProps) => {
  const { t } = useTranslation(meta.id);
  const senderIdentity = members.find(
    (member) =>
      (message.sender.identityDid && member.identity.did === message.sender.identityDid) ||
      (message.sender.identityKey && PublicKey.equals(member.identity.identityKey, message.sender.identityKey)),
  )?.identity;
  const messageMetadata = getMessageMetadata(message.id, senderIdentity);
  const userIsAuthor = useIdentity()?.did === messageMetadata.authorId;
  const [editing, setEditing] = useState(false);
  const handleEdit = useCallback(() => setEditing((editing) => !editing), []);
  const handleDelete = useCallback(() => onDelete?.(message.id), [message, onDelete]);
  const handleAcceptProposal = useCallback(() => onAcceptProposal?.(message.id), [message, onAcceptProposal]);
  const textBlock = message.blocks.find((block) => block._tag === 'text');
  const proposalBlock = message.blocks.find((block) => block._tag === 'proposal');
  const references = message.blocks.filter((block) => block._tag === 'reference').map((block) => block.reference);

  useOnEditAnalytics(message, textBlock, !!editing);

  return (
    <MessageRoot {...messageMetadata} classNames={[hoverableControls, hoverableFocusedWithinControls]}>
      <MessageHeading authorName={messageMetadata.authorName} timestamp={messageMetadata.timestamp}>
        <div role='none' className={buttonGroupClassNames}>
          {userIsAuthor && editable && (
            <IconButton
              data-testid={editing ? 'thread.message.save' : 'thread.message.edit'}
              variant='ghost'
              icon={editing ? 'ph--check--regular' : 'ph--pencil-simple--regular'}
              iconOnly
              label={t(editing ? 'save message label' : 'edit message label')}
              classNames={[buttonClassNames, hoverableControlItem]}
              onClick={handleEdit}
            />
          )}
          {/* TODO(wittjosiah): Proposal controls should probably be hoisted to thread level. */}
          {proposalBlock && onAcceptProposal && (
            <IconButton
              data-testid='thread.message.accept'
              variant='ghost'
              icon='ph--check--regular'
              iconOnly
              label={t('accept proposal label')}
              classNames={[buttonClassNames, hoverableControlItem]}
              onClick={handleAcceptProposal}
            />
          )}
          {onDelete && (
            <IconButton
              data-testid='thread.message.delete'
              variant='ghost'
              icon='ph--x--regular'
              iconOnly
              label={t('delete message label')}
              classNames={[buttonClassNames, hoverableControlItem]}
              onClick={handleDelete}
            />
          )}
        </div>
      </MessageHeading>
      {textBlock && <TextboxBlock block={textBlock} isAuthor={userIsAuthor} editing={editing} />}
      {proposalBlock && <ProposalBlock block={proposalBlock} />}
      {Ref.Array.targets(references).map((reference, index) => (
        <MessagePart key={index} part={reference as Obj.Any} />
      ))}
    </MessageRoot>
  );
};

const MessagePart = ({ part }: { part: Obj.Any }) => {
  return <MessageBlockObjectTile subject={part} />;
};

const TextboxBlock = ({
  block,
  isAuthor,
  editing,
}: {
  block: ContentBlock.Text;
  editing?: boolean;
  isAuthor?: boolean;
  identity?: Identity;
}) => {
  const { themeMode } = useThemeContext();
  const inMemoryContentRef = useRef(block.text);

  const handleDocumentChange = useCallback((newState: string) => {
    inMemoryContentRef.current = newState;
  }, []);

  const saveDocumentChange = useCallback(() => {
    block.text = inMemoryContentRef.current;
  }, [block]);

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
    editing && view?.focus();
  }, [editing, view]);

  return <div role='none' ref={parentRef} className='mie-4' {...focusAttributes} />;
};

const ProposalBlock = ({ block }: { block: ContentBlock.Proposal }) => {
  return (
    <div role='none' className='mie-4 italic'>
      {block.text}
    </div>
  );
};

const MessageBlockObjectTile = forwardRef<HTMLDivElement, { subject: Obj.Any }>(({ subject }, forwardedRef) => {
  // TODO(burdon): Use annotation to get title.
  let title = (subject as any).name ?? (subject as any).title ?? (subject as any).type ?? 'Object';
  if (typeof title !== 'string') {
    title = title?.content ?? '';
  }

  return (
    <div
      role='group'
      className={mx('grid col-span-3 plb-1 pr-4', hoverableControls, hoverableFocusedWithinControls)}
      ref={forwardedRef}
    >
      <Surface role='card' limit={1} data={{ subject }} fallback={title} />
    </div>
  );
});
