//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { DXN, Obj, Type } from '@dxos/echo';
import { Dialog } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type GameVariant } from '#types';

import { CreateGamePanel } from './CreateGamePanel';

// Two dummy variants for the story — no real ECHO state required, just the shape
// the picker reads (label, icon, inputSchema). createVariant is a no-op since we
// don't actually submit through a database here.
const Card = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
}).pipe(Type.makeObject(DXN.make('org.dxos.story.cards', '0.1.0')));

const Dice = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  faces: Schema.optional(Schema.Number.annotations({ title: 'Number of faces' })),
}).pipe(Type.makeObject(DXN.make('org.dxos.story.dice', '0.1.0')));

const dummyVariants: GameVariant[] = [
  {
    id: 'org.dxos.story.cards',
    label: 'Card game',
    icon: 'ph--cards--regular',
    variantType: Card,
    inputSchema: Type.getSchema(Card),
    roles: ['dealer', 'player'] as const,
    createVariant: () => Effect.sync(() => ({}) as unknown as Obj.Any),
  },
  {
    id: 'org.dxos.story.dice',
    label: 'Dice game',
    icon: 'ph--dice-six--regular',
    variantType: Dice,
    inputSchema: Type.getSchema(Dice),
    roles: ['rolling'] as const,
    createVariant: () => Effect.sync(() => ({}) as unknown as Obj.Any),
  },
];

const DefaultStory = () => {
  const [submitted, setSubmitted] = useState<Record<string, any> | undefined>(undefined);
  return (
    <Dialog.Root open>
      <Dialog.Overlay>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Create game</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <CreateGamePanel
              target={{} as any}
              variants={dummyVariants}
              onCreateObject={(data) => {
                setSubmitted(data);
              }}
            />
            {submitted && (
              <pre className='mt-form-gap p-2 text-xs bg-group-surface rounded-xs overflow-auto'>
                {JSON.stringify(submitted, null, 2)}
              </pre>
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const meta = {
  title: 'plugins/plugin-game/components/CreateGamePanel',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withPluginManager()],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
