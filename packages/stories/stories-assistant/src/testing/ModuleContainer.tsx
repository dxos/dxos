//
// Copyright 2025 DXOS.org
//

import React, { type FC, useCallback, useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AiContextBinder } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Assistant } from '@dxos/plugin-assistant/types';
import { useSpace } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { Loading } from '@dxos/react-ui/testing';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { isNonNullable } from '@dxos/util';

import { type ComponentProps, ContextModule } from '../components';

export type ModuleContainerProps = {
  modules: FC<ComponentProps>[][];
  blueprints?: string[];
  showContext?: boolean;
};

export const ModuleContainer = ({ modules: modulesProp, blueprints = [], showContext }: ModuleContainerProps) => {
  const atomRegistry = useCapability(Capabilities.AtomRegistry);
  const blueprintsDefinitions = useCapabilities(AppCapabilities.BlueprintDefinition);
  const space = useSpace();

  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    const chats = await space.db.query(Filter.type(Assistant.Chat)).run();
    const chat = chats.at(-1);
    if (!chat) {
      return;
    }

    // Add blueprints to context.
    const blueprintRegistry = new Blueprint.Registry(blueprintsDefinitions.map((blueprint) => blueprint.make()));
    const blueprintObjects = blueprints
      .map((key) => {
        const blueprint = blueprintRegistry.getByKey(key);
        if (blueprint) {
          return space.db.add(Obj.clone(blueprint));
        }
      })
      .filter(isNonNullable);

    const binder = new AiContextBinder({ queue: await chat.queue.load(), registry: atomRegistry });
    await binder.use((binder) => binder.bind({ blueprints: blueprintObjects.map((blueprint) => Ref.make(blueprint)) }));
  }, [space, blueprints, blueprintsDefinitions]);

  const handleEvent = useCallback<NonNullable<ComponentProps['onEvent']>>((event) => {
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
    <Stack
      orientation='horizontal'
      size='split'
      rail={false}
      itemsCount={modules.length}
      classNames='absolute inset-0 gap-(--stack-gap)'
    >
      {modules.map((Components, i) => {
        return (
          <StackItem.Root key={i} item={{ id: `column-${i}` }}>
            <Stack
              orientation='vertical'
              classNames='gap-(--stack-gap)'
              size={i > 0 ? 'contain' : 'split'}
              itemsCount={Components.length}
              rail={false}
            >
              {Components.map((Component, i) => (
                <StackItem.Root
                  key={i}
                  item={{ id: `module-${i}` }}
                  classNames='bg-base-surface rounded-xs border border-separator overflow-hidden'
                >
                  <Component space={space} onEvent={handleEvent} />
                </StackItem.Root>
              ))}
            </Stack>
          </StackItem.Root>
        );
      })}
    </Stack>
  );
};
