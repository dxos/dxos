//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useCallback, useMemo } from 'react';

import * as ObjectCombobox from '@dxos/app-toolkit/ObjectCombobox';
import { type AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { type Database, Entity, Filter, Obj, Query, type URI } from '@dxos/echo';
import { parseMentions } from '@dxos/react-ui-assistant';
import { type EditorMenuGroup, type UseEditorMenuProps } from '@dxos/react-ui-editor';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { insertAtCursor } from '@dxos/ui-editor';
import { hues } from '@dxos/ui-types';
import { isNonNullable } from '@dxos/util';

/** Rows the `@` menu lists before the query narrows it. */
const MAX_MENTIONS = 20;

const everything = Query.select(Filter.everything());

// Object names are free text, so an unescaped "]" or newline would end the link early.
const escapeLinkLabel = (label: string): string => label.replace(/[[\]]/g, '\\$&').replace(/\s*\r?\n\s*/g, ' ');

/** Inserts a link to `object` at the cursor; sending the message is what adds it to the context. */
export const insertMention = (view: EditorView, object: Obj.Unknown, label: string) => {
  insertAtCursor(view, view.state.selection.main.head, `[${escapeLinkLabel(label)}](${Obj.getURI(object)}) `);
};

/**
 * Binds the objects a message mentions into the conversation's context. Run as the message is sent, so
 * context changes when the reader sends, not while they are still composing.
 */
export const bindMentions = async (context: AiContext.Binder, db: Database.Database, text: string): Promise<void> => {
  const objects = await Promise.all(
    parseMentions(text).map(async ({ uri }) => {
      const ref = db.makeRef<Obj.Unknown>(uri as URI.URI);
      return (await ref.tryLoad()) ? ref : undefined;
    }),
  );
  const refs = objects.filter(isNonNullable);
  if (refs.length > 0) {
    await context.bind({ objects: refs });
  }
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
  const { t } = UiHooks.useTranslation();

  const getMenu = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
    async ({ text }): Promise<EditorMenuGroup[]> => {
      if (!db) {
        return [];
      }

      const name = text.trim().toLowerCase();
      const objects = await db.query(everything).run();
      const byUri = new Map<string, Entity.Any>(
        objects.map((object) => [String(Entity.getURI(object, { prefer: 'named' })), object]),
      );
      // The conversation itself is in context already and never something to mention.
      const items = ObjectCombobox.toOptions(objects, { t, filter: (object) => !Obj.instanceOf(Chat.Chat, object) })
        .filter(({ label }) => label.toLowerCase().includes(name))
        .slice(0, MAX_MENTIONS)
        .flatMap(({ id, label, icon, iconHue }) => {
          const object = byUri.get(id);
          return object && Obj.isObject(object)
            ? [
                {
                  id,
                  label,
                  icon,
                  iconHue: hues.find((hue) => hue === iconHue),
                  onSelect: ({ view }: { view: EditorView }) => insertMention(view, object, label),
                },
              ]
            : [];
        });

      return [{ id: 'objects', items }];
    },
    [db, t],
  );

  return useMemo(
    () => (db ? { trigger: ['@'], multiWordTriggers: ['@'], filter: false, placeholder: false, getMenu } : undefined),
    [db, getMenu],
  );
};
