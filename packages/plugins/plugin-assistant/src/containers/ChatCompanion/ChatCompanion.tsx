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
import { Skill } from '@dxos/compute';
import { Entity, Filter, Obj, Ref, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { useObject, useQuery, useRegistry } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { useContextBinder } from '#hooks';
import { AssistantOperation } from '#types';

import ChatArticle from '../ChatArticle';

export type ChatCompanionProps = AppSurface.ArticleProps<Chat.Chat, {}, Obj.Unknown>;

export const ChatCompanion = forwardRef<HTMLDivElement, ChatCompanionProps>(
  ({ role = 'article', subject: chat, companionTo, attendableId }, forwardedRef) => {
    const { invokePromise } = useOperationInvoker();
    const space = getSpace(companionTo);
    useSkills({ subject: chat, companionTo });

    // Persist (and flush) a transient chat before the first request so the agent can resolve
    // the now-durable conversation feed; subsequent submits are a no-op once persisted.
    const handleSubmit = useCallback(async () => {
      if (!space || !chat || Obj.getDatabase(chat)) {
        return;
      }

      await invokePromise(SpaceOperation.AddObject, {
        object: chat,
        target: space.db,
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
 * Bind skills to the context.
 */
// TODO(burdon): Why is this only in the companion?
const useSkills = ({ subject: chat, companionTo }: Pick<ChatCompanionProps, 'subject' | 'companionTo'>) => {
  const registry = useRegistry();
  const space = getSpace(companionTo);
  const [feedSnapshot] = useObject(chat?.feed);
  const feedTarget = Obj.getReactiveOrUndefined(feedSnapshot);
  const binder = useContextBinder(space, feedTarget);

  const skillKeys = useMemo(() => {
    const schema = companionTo ? Obj.getType(companionTo) : undefined;
    if (!schema) {
      return [] as string[];
    }

    return Option.getOrElse(() => [] as string[])(AppAnnotation.SkillsAnnotation.get(Type.getSchema(schema)));
  }, [companionTo]);

  const existingSkills = useQuery(space?.db, Filter.type(Skill.Skill));
  const pluginSkills = useMemo(
    () =>
      existingSkills.filter((skill) => {
        const key = Obj.getMeta(skill).key;
        return key !== undefined && skillKeys.includes(key);
      }),
    [existingSkills, skillKeys],
  );

  useAsyncEffect(async () => {
    if (!binder?.isOpen) {
      return;
    }

    // Bind annotated skills: use key URI for registry skills (no DB clone needed).
    if (skillKeys.length > 0) {
      const registryKeys = skillKeys.filter((key) => {
        const candidate = registry.list().find((e) => Entity.getMeta(e)?.key === key);
        return candidate != null && Obj.instanceOf(Skill.Skill, candidate);
      });

      // DB-forked skills (in space but not in registry).
      const dbForks = pluginSkills.filter((bp) => !registryKeys.includes(Obj.getMeta(bp).key ?? ''));
      if (registryKeys.length > 0) {
        await binder.bind({ skills: registryKeys.map((key) => Ref.fromURI(Skill.registryURI(key))) });
      }
      if (dbForks.length > 0) {
        await binder.bind({ skills: dbForks.map((skill) => Ref.make(skill)) });
      }
    }

    if (Obj.instanceOf(Skill.Skill, companionTo)) {
      await binder.bind({ skills: [Ref.make(companionTo)] });
    } else {
      await binder.bind({ objects: [Ref.make(companionTo)] });
    }
  }, [binder, skillKeys, pluginSkills, companionTo]);
};

ChatCompanion.displayName = 'ChatCompanion';
