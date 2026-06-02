//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { BlueprintsAnnotation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Chat } from '@dxos/assistant-toolkit';
import { getSpace } from '@dxos/client/echo';
import { Blueprint } from '@dxos/compute';
import { Entity, Filter, Obj, Ref, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { useQuery, useRegistry } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { type ChatEvent } from '#components';
import { useContextBinder } from '#hooks';
import { AssistantOperation } from '#types';

import ChatArticle from '../ChatArticle';

export type ChatCompanionProps = AppSurface.ArticleProps<Chat.Chat, {}, Obj.Unknown>;

export const ChatCompanion = forwardRef<HTMLDivElement, ChatCompanionProps>(
  ({ role, subject: chat, companionTo, attendableId }, forwardedRef) => {
    const { invokePromise } = useOperationInvoker();
    const registry = useRegistry();
    const space = getSpace(companionTo);
    const feedTarget = chat?.feed.target;
    const binder = useContextBinder(space, feedTarget);

    // Persist chat on first submit.
    const handleEvent = useCallback(
      async (event: ChatEvent) => {
        if (!space || !chat) {
          return;
        }

        if (event.type === 'submit' && !Obj.getDatabase(chat)) {
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

    const blueprintKeys = useMemo(() => {
      const schema = companionTo ? Obj.getType(companionTo) : undefined;
      if (!schema) {
        return [] as string[];
      }
      return Option.getOrElse(() => [] as string[])(BlueprintsAnnotation.get(Type.getSchema(schema)));
    }, [companionTo]);
    const existingBlueprints = useQuery(space?.db, Filter.type(Blueprint.Blueprint));
    const pluginBlueprints = useMemo(
      () =>
        existingBlueprints.filter((blueprint) => {
          const key = Obj.getMeta(blueprint).key;
          return key !== undefined && blueprintKeys.includes(key);
        }),
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
        const existingBlueprint = existingBlueprints.find((blueprint) => Obj.getMeta(blueprint).key === key);
        if (existingBlueprint) {
          continue;
        }

        const candidate = registry.list().find((e) => Entity.getMeta(e)?.key === key);
        if (!candidate || !Obj.instanceOf(Blueprint.Blueprint, candidate)) {
          continue;
        }

        space.db.add(Obj.clone(candidate, { deep: true }));
      }
    }, [space, registry, blueprintKeys]);

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
    }, [binder, companionTo, pluginBlueprints]);

    return (
      <ChatArticle
        role={role ?? 'article'}
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
