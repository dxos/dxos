//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/react';
import { Filter, Obj, Query } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { useQuery } from '@dxos/react-client/echo';
import { MenuBuilder, useMenuActions } from '@dxos/react-ui-menu';

import { useChatContext } from '../components';
import { meta } from '../meta';
import { Assistant, AssistantOperation } from '../types';

export type ChatToolbarActionsProps = {
  chat?: Assistant.Chat;
  companionTo?: Obj.Any;
};

export const useChatToolbarActions = ({ chat, companionTo }: ChatToolbarActionsProps) => {
  const { invoke } = useOperationInvoker();
  const { db } = useChatContext('useChatToolbarActions');
  const query = companionTo
    ? Query.select(Filter.id(companionTo.id)).targetOf(Assistant.CompanionTo).source()
    : Query.select(Filter.nothing());

  // TODO(wittjosiah): Query in react vs query in atom?
  const chats = useQuery(db, query);

  // Create stable reference for dependency array to avoid circular reference issues.
  return useMenuActions(
    useMemo(() => {
      return Atom.make(() => {
        const builder = MenuBuilder.make()
          .root({
            label: ['chat toolbar title', { ns: meta.id }],
          })
          .action(
            'new',
            {
              label: ['new thread button', { ns: meta.id }],
              icon: 'ph--plus--regular',
              type: 'new',
            },
            () =>
              invoke(AssistantOperation.SetCurrentChat, {
                companionTo,
                chat: undefined,
              }).pipe(runAndForwardErrors),
          )
          .action(
            'rename',
            {
              label: ['rename thread button', { ns: meta.id }],
              icon: 'ph--magic-wand--regular',
              type: 'rename',
              disabled: !chat,
            },
            () =>
              Effect.gen(function* () {
                invariant(chat);
                yield* invoke(AssistantOperation.UpdateChatName, { chat });
              }).pipe(runAndForwardErrors),
          )
          .action(
            'branch',
            {
              label: ['button branch thread', { ns: meta.id }],
              icon: 'ph--git-branch--regular',
              type: 'branch',
              disabled: true,
            },
            () => {},
          );

        if (chats.length > 0) {
          builder.group(
            'chats',
            {
              label: ['chat history label', { ns: meta.id }],
              icon: 'ph--clock-counter-clockwise--regular',
              selectCardinality: 'single',
              variant: 'dropdownMenu',
            },
            (builder) => {
              chats
                // TODO(wittjosiah): This should be the default sort order.
                .toSorted((a, b) => a.id.localeCompare(b.id))
                .forEach((chat) => {
                  builder.action(
                    chat.id,
                    {
                      label: Obj.getLabel(chat) ?? ['object name placeholder', { ns: Assistant.Chat.typename }],
                    },
                    () =>
                      Effect.gen(function* () {
                        invariant(companionTo);
                        yield* invoke(AssistantOperation.SetCurrentChat, {
                          companionTo,
                          chat,
                        });
                      }).pipe(runAndForwardErrors),
                  );
                });
            },
          );
        }

        return builder.build();
      });
    }, [chats.length, db?.spaceId, companionTo?.id, chat?.id, invoke]),
  );
};
