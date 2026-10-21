//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useCallback, useMemo } from 'react';

import * as ObjectCombobox from '@dxos/app-toolkit/ObjectCombobox';
import { type AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { type Database, EID, Obj, type Ref, type URI } from '@dxos/echo';
import { EntityId } from '@dxos/keys';
import { parseMentions } from '@dxos/react-ui-assistant';
import { type EditorMenuGroup, type UseEditorMenuProps } from '@dxos/react-ui-editor';
import { insertAtCursor } from '@dxos/ui-editor';
import { hues } from '@dxos/ui-types';
import { isNonNullable } from '@dxos/util';

const MAX_MENTIONS = 20;

const notChat = (object: Obj.Unknown) => !Obj.instanceOf(Chat.Chat, object);

const escapeLinkLabel = (label: string): string => label.replace(/[[\]\\]/g, '\\$&').replace(/\s*\r?\n\s*/g, ' ');

/** The markup of a mention: a link to `object`, and the space after it. */
export const mentionText = (object: Obj.Unknown, label: string): string =>
  `[${escapeLinkLabel(label)}](${Obj.getURI(object)}) `;

/** Inserts a link to `object` at the cursor; sending the message is what adds it to the context. */
export const insertMention = (view: EditorView, object: Obj.Unknown, label: string) => {
  insertAtCursor(view, view.state.selection.main.head, mentionText(object, label));
};

/**
 * Binds the objects a message mentions into the conversation's context. Run as the message is sent, so
 * context changes when the reader sends, not while they are still composing.
 */
export const bindMentions = async (context: AiContext.Binder, db: Database.Database, text: string): Promise<void> => {
  const refs = await resolveMentions(db, text);
  if (refs.length > 0) {
    await context.bind({ objects: refs });
  }
};

const isMention = (db: Database.Database, uri: string): boolean => {
  const eid = EID.tryParse(uri);
  const id = eid && EID.getEntityId(eid);
  const spaceId = eid && EID.getSpaceId(eid);
  return id !== undefined && EntityId.isValid(id) && (spaceId === undefined || spaceId === db.spaceId);
};

/** The objects of `db` a message's links name. */
export const resolveMentions = async (db: Database.Database, text: string): Promise<Ref.Ref<Obj.Unknown>[]> => {
  const objects = await Promise.all(
    parseMentions(text)
      .filter(({ uri }) => isMention(db, uri))
      .map(async ({ uri }) => {
        const ref = db.makeRef<Obj.Unknown>(uri as URI.URI);
        return (await ref.tryLoad()) ? ref : undefined;
      }),
  );
  return objects.filter(isNonNullable);
};

export type UseObjectMentionsProps = {
  db?: Database.Database;
};

/**
 * The `@` menu: lists the space's objects and inserts a link to the one picked. The link is what sending
 * the message adds to the context (see {@link bindMentions}), so the message reads the way it was meant
 * and the agent has what it names.
 */
export const useObjectMentions = ({ db }: UseObjectMentionsProps): UseEditorMenuProps | undefined => {
  const search = ObjectCombobox.useSearch(db, { filter: notChat, limit: MAX_MENTIONS });
  const getMenu = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
    async ({ text }): Promise<EditorMenuGroup[]> => {
      const options = (await search(text)) ?? [];
      const items = options.map(({ id, label, icon, iconHue, object }) => ({
        id,
        label,
        icon,
        iconHue: hues.find((hue) => hue === iconHue),
        onSelect: ({ view }: { view: EditorView }) => insertMention(view, object, label),
      }));
      return [{ id: 'objects', items }];
    },
    [search],
  );

  return useMemo(
    () => (db ? { trigger: ['@'], multiWordTriggers: ['@'], filter: false, placeholder: false, getMenu } : undefined),
    [db, getMenu],
  );
};
