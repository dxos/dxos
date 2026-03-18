//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { type FC, useCallback, useMemo } from 'react';

import { ToolId } from '@dxos/ai';
import { EXA_API_KEY } from '@dxos/ai/testing';
import { Capabilities } from '@dxos/app-framework';
import { Surface, useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AiContextBinder } from '@dxos/assistant';
import {
  AgentFunctions,
  LinearBlueprint,
  MarkdownBlueprint,
  ResearchBlueprint,
  ResearchDataTypes,
  ResearchGraph,
  WebSearchBlueprint,
} from '@dxos/assistant-toolkit';
import { Blueprint, Prompt, Template } from '@dxos/blueprints';
import { Feed, Filter, JsonSchema, Obj, Query, Ref, Tag } from '@dxos/echo';
import { View } from '@dxos/echo';
import { ExampleFunctions, Script, Trigger, serializeFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { AssistantBlueprint, translations, useContextBinder } from '@dxos/plugin-assistant';
import { Assistant } from '@dxos/plugin-assistant/types';
import { ChessBlueprint, ChessFunctions } from '@dxos/plugin-chess/blueprints';
import { CalendarBlueprint, InboxBlueprint } from '@dxos/plugin-inbox/blueprints';
import { Calendar, Mailbox } from '@dxos/plugin-inbox/types';
import { MapBlueprint } from '@dxos/plugin-map/blueprints';
import { Markdown } from '@dxos/plugin-markdown/types';
import { ThreadBlueprint } from '@dxos/plugin-thread/blueprints';
import { TranscriptionBlueprint } from '@dxos/plugin-transcription/blueprints';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { ScrollArea, Toolbar, useAsyncEffect } from '@dxos/react-ui';
import { withLayout, withTheme, Loading } from '@dxos/react-ui/testing';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { Text, ViewModel } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { type ComponentProps, ContextModule } from '../components';

const panelClassNames = 'bg-base-surface rounded-xs border border-separator overflow-hidden';

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
    const chat = chats[0];
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
                <StackItem.Root key={i} item={{ id: `module-${i}` }} classNames={panelClassNames}>
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
