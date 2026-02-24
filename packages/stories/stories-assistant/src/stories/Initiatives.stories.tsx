//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC, useCallback } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { Surface, useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AiContextBinder } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { translations, useContextBinder } from '@dxos/plugin-assistant';
import { Assistant } from '@dxos/plugin-assistant/types';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { render } from '@dxos/storybook-utils';
import { isNonNullable } from '@dxos/util';

import { ChatModule, type ComponentProps } from '../components';
import { config, getDecorators } from '../testing';

const panelClassNames = 'bg-base-surface rounded-xs border border-separator overflow-hidden';

type StoryProps = {
  modules: FC<ComponentProps>[][];
  blueprints?: string[];
  showContext?: boolean;
};

const DefaultStory = ({ modules, showContext, blueprints = [] }: StoryProps) => {
  const blueprintsDefinitions = useCapabilities(AppCapabilities.BlueprintDefinition);
  const atomRegistry = useCapability(Capabilities.AtomRegistry);

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

  const chats = useQuery(space?.db, Filter.type(Assistant.Chat));
  const binder = useContextBinder(chats.at(-1)?.queue.target);
  const objects = binder?.getObjects() ?? [];

  if (!space) {
    return null;
  }

  return (
    <Stack
      orientation='horizontal'
      size='split'
      rail={false}
      itemsCount={modules.length + (showContext ? 1 : 0)}
      classNames='absolute inset-0 gap-(--stack-gap)'
    >
      {modules.map((Components, i) => {
        return (
          <StackItem.Root key={i} item={{ id: `${i}` }}>
            <Stack
              orientation='vertical'
              classNames='gap-(--stack-gap)'
              size={i > 0 ? 'contain' : 'split'}
              itemsCount={Components.length}
              rail={false}
            >
              {Components.map((Component, i) => (
                <StackItem.Root key={i} item={{ id: `${i}` }} classNames={panelClassNames}>
                  <Component space={space} onEvent={handleEvent} />
                </StackItem.Root>
              ))}
            </Stack>
          </StackItem.Root>
        );
      })}

      {showContext && <StackContainer objects={objects} />}
    </Stack>
  );
};

const StackContainer = ({ objects }: { objects: Obj.Any[] }) => {
  return (
    <Stack
      orientation='vertical'
      classNames='gap-(--stack-gap)'
      size='contain'
      rail={false}
      itemsCount={objects.length}
    >
      {objects.map((object) => (
        <StackItem.Root key={object.id} item={object} classNames={panelClassNames}>
          <Surface.Surface role='section' limit={1} data={{ subject: object }} />
        </StackItem.Root>
      ))}
    </Stack>
  );
};

const storybook: Meta<typeof DefaultStory> = {
  title: 'stories/stories-assistant/Initiatives',
  render: render(DefaultStory),
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default storybook;

type Story = StoryObj<typeof storybook>;

export const Default: Story = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin()],
    config: config.remote,
  }),
  args: {
    modules: [[ChatModule]],
  },
};
