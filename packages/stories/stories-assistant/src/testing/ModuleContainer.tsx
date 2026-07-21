//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { Skill } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import { EffectEx } from '@dxos/effect';
import { Assistant } from '@dxos/plugin-assistant';
import { useSpaces } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import {
  ModuleContainer as StoryModuleContainer,
  ModuleContainerProps as StoryModuleContainerProps,
} from '@dxos/story-modules';
import { isNonNullable } from '@dxos/util';

export type ModuleContainerProps = Pick<StoryModuleContainerProps, 'layout'> & {
  skills?: string[];
};

/**
 * Assistant-flavored wrapper over the generic `@dxos/story-modules` container. Adds the
 * assistant-specific behavior — binding story skills into the chat context — on top of the reusable
 * surface-grid mechanism.
 */
export const ModuleContainer = ({ layout, skills = [] }: ModuleContainerProps) => {
  const atomRegistry = useCapability(Capabilities.AtomRegistry);
  const skillsDefinitions = useCapabilities(AppCapabilities.SkillDefinition);
  const [space] = useSpaces();

  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    const chats = await space.db.query(Filter.type(Assistant.Chat)).run();
    const chat = chats.at(-1);
    if (!chat) {
      return;
    }

    // Add skills to context.
    const registry = makeRegistry({ initial: skillsDefinitions.map((def) => def.make()) });
    const skillObjects = skills
      .map((key) => {
        const skill = registry
          .query(Filter.type(Skill.Skill))
          .runSync()
          .find((candidateSkill) => Obj.getMeta(candidateSkill).key === key);
        if (skill) {
          return space.db.add(Obj.clone(skill));
        }
      })
      .filter(isNonNullable);

    const feedTarget = await chat.feed.load();
    const runtime = await EffectEx.runAndForwardErrors(
      Effect.runtime<Database.Service>().pipe(Effect.provide(Database.layer(space.db))),
    );
    const binder = new AiContext.Binder({ feed: feedTarget, runtime, registry: atomRegistry });
    await binder.use((binder) => binder.bind({ skills: skillObjects.map((skill) => Ref.make(skill)) }));
  }, [space, skills, skillsDefinitions]);

  return <StoryModuleContainer layout={layout} />;
};
