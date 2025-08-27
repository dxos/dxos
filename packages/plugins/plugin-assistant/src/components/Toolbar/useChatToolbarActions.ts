//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Effect } from 'effect';
import { useMemo } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Filter, Obj, Query } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { MenuBuilder, useMenuActions } from '@dxos/react-ui-menu';

import { meta } from '../../meta';
import { Assistant, AssistantAction } from '../../types';

export type ChatToolbarActionsProps = {
  chat: Assistant.Chat;
  companionTo?: Obj.Any;
  onReset?: () => void;
};

export const useChatToolbarActions = ({ chat, companionTo, onReset }: ChatToolbarActionsProps) => {
  const { dispatch } = useIntentDispatcher();
  const space = getSpace(chat);
  const query = companionTo
    ? Query.select(Filter.ids(companionTo.id)).targetOf(Assistant.CompanionTo).source()
    : Query.select(Filter.nothing());
  // TODO(wittjosiah): Query in react vs query in rx?
  const chats = useQuery(space, query);

  return useMenuActions(
    useMemo(
      () =>
        Rx.make(() => {
          const base = MenuBuilder.make()
            .root({
              label: ['chat toolbar title', { ns: meta.id }],
            })
            .action(
              'new',
              () =>
                Effect.gen(function* () {
                  invariant(space);
                  const { object } = yield* dispatch(createIntent(AssistantAction.CreateChat, { space }));
                  yield* dispatch(createIntent(SpaceAction.AddObject, { object, target: space, hidden: true }));
                  if (companionTo) {
                    yield* dispatch(
                      createIntent(SpaceAction.AddRelation, {
                        space,
                        schema: Assistant.CompanionTo,
                        source: object,
                        target: companionTo,
                      }),
                    );
                    yield* dispatch(createIntent(AssistantAction.SetCurrentChat, { companionTo, chat: object }));
                  }
                }).pipe(Effect.runPromise),
              {
                label: ['button new thread', { ns: meta.id }],
                icon: 'ph--plus--regular',
                type: 'new',
              },
            )
            .action('branch', () => {}, {
              label: ['button branch thread', { ns: meta.id }],
              icon: 'ph--git-branch--regular',
              type: 'branch',
              disabled: true,
            });

          if (chats.length > 0) {
            base.group(
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
                      () =>
                        Effect.gen(function* () {
                          invariant(companionTo);
                          yield* dispatch(createIntent(AssistantAction.SetCurrentChat, { companionTo, chat }));
                        }).pipe(Effect.runPromise),
                      {
                        label: Obj.getLabel(chat) ?? ['object name placeholder', { ns: Assistant.Chat.typename }],
                      },
                    );
                  });
              },
            );
          }

          if (onReset) {
            base.action('reset', onReset, {
              label: ['button reset', { ns: meta.id }],
              icon: 'ph--trash--regular',
              type: 'reset',
            });
          }

          return base.build();
        }),
      [chats],
    ),
  );
};
