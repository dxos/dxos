//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as Chat from '@dxos/assistant/Chat';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { AssistantOperation } from '#types';

import { useChatContext } from '../components/Chat/context';

/**
 * Scopes the toolbar's chat switcher: which chats it lists, and what picking one does.
 *
 * Without it the switcher shows the companion chats of `companionTo` and switches the companion,
 * which is what the app wants nearly everywhere. A caller that owns its own chat selection (a
 * story showing every chat in a space, a panel scoped to a project) passes its own.
 */
export type ChatSwitcher = {
  chats: Chat.Chat[];
  onSelect: (chat: Chat.Chat) => void;
};

export type ChatToolbarActionsProps = {
  chat?: Chat.Chat;
  companionTo?: Obj.Unknown;
  switcher?: ChatSwitcher;
};

export const useChatToolbarActions = ({ chat, companionTo, switcher }: ChatToolbarActionsProps) => {
  const { invoke } = useOperationInvoker();
  const { db } = useChatContext('useChatToolbarActions');

  // Stable references in deps avoid circular reference issues.
  return useMenuBuilder(
    (get) => {
      const chats =
        switcher?.chats ??
        (companionTo && db
          ? get(db.query(Query.select(Filter.id(companionTo.id)).children()).atom).filter(Obj.instanceOf(Chat.Chat))
          : []);

      const builder = MenuBuilder.make().root({
        label: ['chat-toolbar.title', { ns: meta.profile.key }],
      });

      if (companionTo) {
        builder.action(
          'new',
          {
            label: ['new-thread.button', { ns: meta.profile.key }],
            icon: 'ph--plus--regular',
            type: 'new',
          },
          () => {
            invariant(companionTo);
            return invoke(AssistantOperation.SetCurrentChat, {
              companionTo,
              chat: undefined,
            }).pipe(EffectEx.runAndForwardErrors);
          },
        );
      }

      builder
        .action(
          'branch',
          {
            label: ['branch-thread.menu', { ns: meta.profile.key }],
            icon: 'ph--git-branch--regular',
            type: 'branch',
            disabled: !chat || !db,
          },
          () =>
            Effect.gen(function* () {
              invariant(chat);
              yield* invoke(AssistantOperation.ForkChat, { chat, companionTo }, { spaceId: db?.spaceId });
            }).pipe(EffectEx.runAndForwardErrors),
        )
        .action(
          'rename',
          {
            label: ['rename-thread.button', { ns: meta.profile.key }],
            icon: 'ph--magic-wand--regular',
            type: 'rename',
            disabled: !chat,
          },
          () =>
            Effect.gen(function* () {
              invariant(chat);
              yield* invoke(AssistantOperation.UpdateChatName, { chat }, { spaceId: db?.spaceId });
            }).pipe(EffectEx.runAndForwardErrors),
        );

      if (chats.length > 0) {
        builder.separator().group(
          'chats',
          {
            label: ['chat-history.label', { ns: meta.profile.key }],
            icon: 'ph--clock-counter-clockwise--regular',
            selectCardinality: 'single',
            variant: 'dropdownMenu',
          },
          (builder) => {
            chats
              // TODO(wittjosiah): This should be the default sort order.
              .toSorted((a, b) => a.id.localeCompare(b.id))
              .forEach((chat) => {
                get(Obj.atomProperty(chat, 'name'));

                builder.action(
                  chat.id,
                  {
                    label: Obj.getLabel(chat) ?? ['object-name.placeholder', { ns: Type.getTypename(Chat.Chat) }],
                  },
                  () => {
                    if (switcher) {
                      switcher.onSelect(chat);
                      return;
                    }
                    return Effect.gen(function* () {
                      invariant(companionTo);
                      yield* invoke(AssistantOperation.SetCurrentChat, {
                        companionTo,
                        chat,
                      });
                    }).pipe(EffectEx.runAndForwardErrors);
                  },
                );
              });
          },
        );
      }

      return builder.build();
    },
    [db?.spaceId, companionTo?.id, chat?.id, invoke, switcher?.chats.map(({ id }) => id).join(), switcher?.onSelect],
  );
};
