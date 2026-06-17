//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { AppAnnotation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Chat } from '@dxos/assistant-toolkit';
import { getSpace } from '@dxos/client/echo';
import { Blueprint } from '@dxos/compute';
import { Entity, Filter, Obj, Ref, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { useQuery, useRegistry } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { useContextBinder } from '#hooks';
import { AssistantOperation } from '#types';

import ChatArticle from '../ChatArticle';

export type ChatCompanionProps = AppSurface.ArticleProps<Chat.Chat, {}, Obj.Unknown>;

export const ChatCompanion = forwardRef<HTMLDivElement, ChatCompanionProps>(
  ({ role = 'article', subject: chat, companionTo, attendableId }, forwardedRef) => {
    const { invokePromise } = useOperationInvoker();
    const space = getSpace(companionTo);
    useBlueprints({ subject: chat, companionTo });

    // Persist (and flush) a transient chat before the first request so the agent can resolve
    // the now-durable conversation feed; subsequent submits are a no-op once persisted.
    const handleSubmit = useCallback(async () => {
      if (!space || !chat || Obj.getDatabase(chat)) {
        return;
      }

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
      await space.db.flush();
    }, [space, chat, companionTo, invokePromise]);

    return (
      <ChatArticle
        role={role}
        subject={chat}
        attendableId={attendableId}
        companionTo={companionTo}
        onSubmit={handleSubmit}
        ref={forwardedRef}
      />
    );
  },
);

/**
 * Bind blueprints to the context.
 */
// TODO(burdon): Why is this only in the companion?
const useBlueprints = ({ subject: chat, companionTo }: Pick<ChatCompanionProps, 'subject' | 'companionTo'>) => {
  const registry = useRegistry();
  const space = getSpace(companionTo);
  const feedTarget = chat?.feed.target;
  const binder = useContextBinder(space, feedTarget);

  const blueprintKeys = useMemo(() => {
    const schema = companionTo ? Obj.getType(companionTo) : undefined;
    if (!schema) {
      return [] as string[];
    }

    return Option.getOrElse(() => [] as string[])(AppAnnotation.BlueprintsAnnotation.get(Type.getSchema(schema)));
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

  useAsyncEffect(async () => {
    if (!binder?.isOpen) {
      return;
    }

    // Bind annotated blueprints: use key URI for registry blueprints (no DB clone needed).
    if (blueprintKeys.length > 0) {
      const registryKeys = blueprintKeys.filter((key) => {
        const candidate = registry.list().find((e) => Entity.getMeta(e)?.key === key);
        return candidate != null && Obj.instanceOf(Blueprint.Blueprint, candidate);
      });

      // DB-forked blueprints (in space but not in registry).
      const dbForks = pluginBlueprints.filter((bp) => !registryKeys.includes(Obj.getMeta(bp).key ?? ''));
      if (registryKeys.length > 0) {
        await binder.bind({ blueprints: registryKeys.map((key) => Ref.fromURI(Blueprint.registryURI(key))) });
      }
      if (dbForks.length > 0) {
        await binder.bind({ blueprints: dbForks.map((blueprint) => Ref.make(blueprint)) });
      }
    }

    if (Obj.instanceOf(Blueprint.Blueprint, companionTo)) {
      await binder.bind({ blueprints: [Ref.make(companionTo)] });
    } else {
      await binder.bind({ objects: [Ref.make(companionTo)] });
    }
  }, [binder, blueprintKeys, pluginBlueprints, companionTo]);
};
