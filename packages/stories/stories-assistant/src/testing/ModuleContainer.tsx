//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type FC, useCallback, useEffect, useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { AppCapabilities, AppSpace, Paths } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { Skill } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Assistant } from '@dxos/plugin-assistant';
import { StorybookCapabilities } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { Loading } from '@dxos/react-ui/testing';
import { isNonNullable } from '@dxos/util';

import { ContextModule, type ModuleProps } from '../components';

const moduleClassNames = 'bg-base-surface rounded-xs border border-separator overflow-hidden min-h-0';

export type ModuleContainerProps = {
  modules: FC<ModuleProps>[][];
  skills?: string[];
  showContext?: boolean;
};

export const ModuleContainer = ({ modules: modulesProp, skills = [], showContext }: ModuleContainerProps) => {
  const atomRegistry = useCapability(Capabilities.AtomRegistry);
  const skillsDefinitions = useCapabilities(AppCapabilities.SkillDefinition);
  const layoutState = useCapability(StorybookCapabilities.LayoutState);
  const [space] = useSpaces();

  // Set the active workspace so surfaces relying on `useActiveSpace()` (e.g. the TracePanel
  // deck-companion surface) resolve to this space. Done here, from the React tree, because the
  // plugin-module activation context resolves a different AtomRegistry than the one the UI reads.
  useEffect(() => {
    if (space && AppSpace.getActiveSpaceId(atomRegistry.get(layoutState).workspace) !== space.id) {
      atomRegistry.set(layoutState, { ...atomRegistry.get(layoutState), workspace: Paths.getSpacePath(space.id) });
    }
  }, [space, layoutState, atomRegistry]);

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
          .find((b) => Obj.getMeta(b).key === key);
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

  const handleEvent = useCallback<NonNullable<ModuleProps['onEvent']>>((event) => {
    log.info('event', { event });
  }, []);

  // TODO(burdon): Prop to add DatabaseModule?
  const modules = useMemo(() => {
    return [...modulesProp, ...(showContext ? [[ContextModule]] : [])];
  }, [modulesProp, showContext]);

  if (!space) {
    return <Loading data={{ space: !!space }} />;
  }

  return (
    <div
      className='dx-container absolute inset-0 grid gap-2 p-2'
      style={{ gridTemplateColumns: `repeat(${modules.length}, minmax(0, 1fr))` }}
    >
      {modules.map((Components, columnIndex) => (
        <div
          key={columnIndex}
          className='dx-container grid gap-2'
          style={{ gridTemplateRows: `repeat(${Components.length}, minmax(0, 1fr))` }}
        >
          {Components.map((Component, moduleIndex) => (
            <div key={moduleIndex} className='border border-separator rounded-md overflow-hidden'>
              <Component space={space} onEvent={handleEvent} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
