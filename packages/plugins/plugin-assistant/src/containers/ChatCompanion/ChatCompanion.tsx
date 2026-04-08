//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type CompanionSurfaceProps } from '@dxos/app-toolkit/ui';
import { Chat } from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { type ChatEvent } from '#components';
import { useBlueprintRegistry, useContextBinder } from '#hooks';
import { AssistantOperation } from '#operations';

import ChatContainer from '../ChatContainer';

export type ChatCompanionProps = CompanionSurfaceProps<Chat.Chat>;

export const ChatCompanion = forwardRef<HTMLDivElement, ChatCompanionProps>(
  ({ role, subject: chat, companionTo, attendableId }, forwardedRef) => {
    const { invokePromise } = useOperationInvoker();
    const blueprintRegistry = useBlueprintRegistry();
    const space = getSpace(companionTo);
    const feedTarget = chat?.feed.target;
    const binder = useContextBinder(space, feedTarget);

    // Persist chat on first submit.
    const handleEvent = useCallback(
      async (event: ChatEvent) => {
        if (!space || !chat) {
          return;
        }

        if (event.type === 'submit' && !getSpace(chat)) {
          await invokePromise(SpaceOperation.AddObject, {
            object: chat,
            target: space.db,
            hidden: true,
          });
          await invokePromise(SpaceOperation.AddRelation, {
            db: space.db,
            schema: Chat.CompanionTo,
            source: chat,
            target: companionTo,
          });
          await invokePromise(AssistantOperation.SetCurrentChat, {
            companionTo,
            chat,
          });
        }
      },
      [chat, space, companionTo, invokePromise],
    );

    const metadata = useCapabilities(AppCapabilities.Metadata);
    const blueprintKeys = useMemo(
      () =>
        Function.pipe(
          metadata,
          Array.findFirst(
            (
              capability,
            ): capability is {
              id: string;
              metadata: { blueprints?: string[] };
            } => capability.id === Obj.getTypename(companionTo),
          ),
          Option.flatMap((c) => Option.fromNullable(c.metadata.blueprints)),
          Option.getOrElse(() => [] as string[]),
        ),
      [metadata, companionTo],
    );
    const existingBlueprints = useQuery(space?.db, Filter.type(Blueprint.Blueprint));
    const pluginBlueprints = useMemo(
      () => existingBlueprints.filter((blueprint) => blueprintKeys.includes(blueprint.key)),
      [existingBlueprints, blueprintKeys],
    );

    // Initialize related blueprints that are not already in the space.
    useAsyncEffect(async () => {
      if (!space) {
        return;
      }

      // NOTE: This must be run instead of using the useQuery result to avoid duplicates.
      const existingBlueprints = await space.db.query(Filter.type(Blueprint.Blueprint)).run();
      for (const key of blueprintKeys) {
        const existingBlueprint = existingBlueprints.find((blueprint) => blueprint.key === key);
        if (existingBlueprint) {
          continue;
        }

        const blueprint = blueprintRegistry.getByKey(key);
        if (!blueprint) {
          continue;
        }

        space.db.add(Obj.clone(blueprint, { deep: true }));
      }
    }, [space, blueprintRegistry, blueprintKeys]);

    useAsyncEffect(async () => {
      if (!binder?.isOpen) {
        return;
      }

      if (pluginBlueprints.length > 0) {
        await binder.bind({
          blueprints: pluginBlueprints.map((blueprint) => Ref.make(blueprint)),
        });
      }

      if (Obj.instanceOf(Blueprint.Blueprint, companionTo)) {
        await binder.bind({ blueprints: [Ref.make(companionTo)] });
      } else {
        await binder.bind({ objects: [Ref.make(companionTo)] });
      }
    }, [binder, companionTo, blueprintKeys]);

    return (
      <ChatContainer
        role={role}
        space={space}
        subject={chat}
        attendableId={attendableId}
        companionTo={companionTo}
        onEvent={handleEvent}
        ref={forwardedRef}
      />
    );
  },
);
