//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useEffect, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import { Annotation, Collection, DXN, Obj, Ref, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import * as SpaceOperationHandlerSet from '../../operations/SpaceOperationHandlerSet.ts';
import { AddToCollectionDialog } from './AddToCollectionDialog.tsx';

class Note extends Type.makeObject<Note>(DXN.make('com.example.type.note', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.UserType.set(),
  ),
) {}

/**
 * The note is already in Inbox, and Projects holds a nested Archive; the dialog offers both of the others
 * and shows Inbox checked.
 */
const DefaultStory = () => {
  const [space] = useSpaces();
  const [note, setNote] = useState<Note>();
  useEffect(() => {
    if (!space || note) {
      return;
    }
    const created = space.db.add(Obj.make(Note, { name: 'Meeting notes' }));
    space.db.add(Collection.make({ name: 'Inbox', objects: [Ref.make(created)] }));
    const archive = space.db.add(Collection.make({ name: 'Archive' }));
    space.db.add(Collection.make({ name: 'Projects', objects: [Ref.make(archive)] }));
    setNote(created);
  }, [space, note]);

  return note ? (
    <>
      <Listing note={note} />
      <Dialog.Root defaultOpen>
        <Dialog.Overlay>
          <AddToCollectionDialog object={note} />
        </Dialog.Overlay>
      </Dialog.Root>
    </>
  ) : (
    <Loading />
  );
};

/** Readout for the play test: the collections that list the note. */
const Listing = ({ note }: { note: Note }) => {
  const listing = useQuery(Obj.getDatabase(note), ContainerModel.containing(note));
  return (
    <div data-testid='listing'>
      {listing
        .map((collection) => collection.name)
        .toSorted()
        .join(',')}
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-space/containers/AddToCollectionDialog',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.contribute(AppCapabilities.Translations, translations),
        // Picking a collection files the object through `AddObject`.
        Capability.contribute(Capabilities.OperationHandler, SpaceOperationHandlerSet.handlers),
      ],
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        ClientPlugin.make({
          types: [Note, Collection.Collection],
          onClientInitialized: ({ client }) => Effect.asVoid(initializeIdentity(client)),
        }),
      ],
    }),
  ],
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Picking a collection lists the object there too, leaving it in the one it was already in. */
export const Pick: Story = {
  play: async () => {
    const body = within(document.body);
    await waitFor(async () => expect(await body.findByTestId('listing')).toHaveTextContent('Inbox'), {
      timeout: 15_000,
    });

    await userEvent.click(await body.findByText('Archive', undefined, { timeout: 15_000 }));
    await waitFor(async () => expect(await body.findByTestId('listing')).toHaveTextContent('Archive,Inbox'), {
      timeout: 5_000,
    });
  },
};
