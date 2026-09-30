//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, DXN, Filter, Obj, Ref, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { FactoryAnnotation, type FactoryFn } from '@dxos/schema';

import { translations } from '#translations';
import { SpaceCapabilities, SpaceOperation } from '#types';

import * as SpaceOperationHandlerSet from '../../operations/SpaceOperationHandlerSet.ts';
import { type ObjectFormHandle, makeObjectFormHandle } from '../../util/index.ts';
import { ObjectFormDialog } from './ObjectFormDialog.tsx';

/** A child object the bookmark's required ref points at — only the factory below can supply it. */
class Visits extends Type.makeObject<Visits>(DXN.make('com.example.type.visits', '0.1.0'))(
  Schema.Struct({ count: Schema.optional(Schema.Number) }),
) {}

/**
 * A type whose fields the live form writes straight through to. Shaped like the types this dialog
 * exists for: a required ref that `Obj.make` alone cannot satisfy, so construction goes through the
 * schema's `FactoryAnnotation`.
 */
class Bookmark extends Type.makeObject<Bookmark>(DXN.make('com.example.type.bookmark', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
    url: Schema.optional(Schema.String.annotate({ title: 'Url' })),
    visits: Ref.Ref(Visits).pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(FactoryAnnotation.set(((values) => makeBookmark(values)) as FactoryFn)),
) {}

const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>): Bookmark => {
  const visits = Obj.make(Visits, { count: 0 });
  const bookmark = Obj.make(Bookmark, { ...props, visits: Ref.make(visits) });
  Obj.setParent(visits, bookmark);
  return bookmark;
};

const typename = Type.getTypename(Bookmark);

const DefaultStory = ({ mode = 'live' }: { mode?: 'draft' | 'live' }) => {
  const [space] = useSpaces();
  const bookmarks = useQuery(space?.db, Filter.type(Bookmark));
  // What the operation would receive: `pending` until the dialog settles, then `ref` or `dismissed`.
  const [settled, setSettled] = useState<Ref.Ref<Obj.Unknown> | 'pending' | 'dismissed'>('pending');
  const handle = useMemo<ObjectFormHandle>(
    () => makeObjectFormHandle((result) => setSettled(result ?? 'dismissed')),
    [],
  );

  return (
    <>
      {/* Readout for the play tests. Outside the loading guard: a cancel drops the object, and the
          readout has to survive that. */}
      <div data-testid='counts'>
        {`objects:${bookmarks.length} settled:${
          settled === 'pending' || settled === 'dismissed' ? settled : 'committed'
        }`}
      </div>
      {space ? (
        <Dialog.Root defaultOpen>
          <Dialog.Overlay>
            <ObjectFormDialog
              target={space.db}
              typename={typename}
              mode={mode}
              defaults={{ name: 'Seeded' }}
              handle={handle}
              shouldNavigate={() => false}
            />
          </Dialog.Overlay>
        </Dialog.Root>
      ) : (
        <Loading />
      )}
    </>
  );
};

const meta = {
  title: 'plugins/plugin-space/containers/ObjectFormDialog',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.contribute(AppCapabilities.Translations, translations),
        // Confirming files the object through `AddObject`, so the story registers the handler set
        // the space plugin would normally contribute.
        Capability.contribute(Capabilities.OperationHandler, SpaceOperationHandlerSet.handlers),
        // What a draft create builds from: a name is required, so a blank one holds the submit.
        Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
          id: typename,
          inputSchema: Schema.Struct({
            name: Schema.String.pipe(
              Schema.check(Schema.makeFilter((value: string) => value.trim().length > 0 || 'Name cannot be empty.')),
              Schema.annotate({ title: 'Name' }),
            ),
            url: Schema.optional(Schema.String.annotate({ title: 'Url' })),
          }),
          createObject: (props, options) =>
            Operation.invoke(
              SpaceOperation.AddObject,
              { object: makeBookmark(props), target: options.target },
              { spaceId: options.db.spaceId },
            ),
        }),
      ],
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        ClientPlugin.make({
          types: [Bookmark, Visits],
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

/**
 * The object exists before the form opens, so the form writes straight through to it — and the
 * seeded defaults are already on it rather than only in the form's state.
 */
export const LiveEdit: Story = {
  play: async () => {
    const body = within(document.body);
    await waitFor(async () => expect(await body.findByTestId('counts')).toHaveTextContent('objects:1'), {
      timeout: 15_000,
    });

    const name = await body.findByLabelText(/^name$/i, undefined, { timeout: 15_000 });
    await expect(name).toHaveValue('Seeded');

    const url = await body.findByLabelText(/^url$/i);
    await userEvent.clear(url);
    await userEvent.type(url, 'https://example.com');
    await waitFor(async () => expect(url).toHaveValue('https://example.com'));
  },
};

/** Cancelling takes the object back out, so a dismissed create leaves nothing behind. */
export const LiveCancelled: Story = {
  play: async () => {
    const body = within(document.body);
    await waitFor(async () => expect(await body.findByTestId('counts')).toHaveTextContent('objects:1'), {
      timeout: 15_000,
    });

    await userEvent.click(await body.findByTestId('object-form.cancel'));
    await waitFor(
      async () => expect(await body.findByTestId('counts')).toHaveTextContent('objects:0 settled:dismissed'),
      {
        timeout: 5_000,
      },
    );
  },
};

/** Confirming keeps the object and settles the handle with it — what the operation returns. */
export const LiveConfirmed: Story = {
  play: async () => {
    const body = within(document.body);
    await waitFor(async () => expect(await body.findByTestId('counts')).toHaveTextContent('objects:1'), {
      timeout: 15_000,
    });

    await userEvent.click(await body.findByTestId('object-form.confirm'));
    await waitFor(
      async () => expect(await body.findByTestId('counts')).toHaveTextContent('objects:1 settled:committed'),
      {
        timeout: 5_000,
      },
    );
  },
};

/** Enter in a single-line field confirms a live create, as the Create button does. */
export const LiveEnterConfirms: Story = {
  play: async () => {
    const body = within(document.body);
    await waitFor(async () => expect(await body.findByTestId('counts')).toHaveTextContent('objects:1'), {
      timeout: 15_000,
    });

    await userEvent.click(await body.findByLabelText(/^url$/i, undefined, { timeout: 15_000 }));
    await userEvent.keyboard('{Enter}');
    await waitFor(
      async () => expect(await body.findByTestId('counts')).toHaveTextContent('objects:1 settled:committed'),
      { timeout: 5_000 },
    );
  },
};

/** A draft create: nothing exists until the form is submitted. */
export const Draft: Story = {
  args: { mode: 'draft' },
};

/** Enter in a single-line field creates the object and closes the dialog. */
export const DraftEnterCreates: Story = {
  args: { mode: 'draft' },
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByLabelText(/^url$/i, undefined, { timeout: 15_000 }));
    await userEvent.paste('https://example.com');
    await userEvent.keyboard('{Enter}');

    await waitFor(
      async () => expect(await body.findByTestId('counts')).toHaveTextContent('objects:1 settled:committed'),
      { timeout: 5_000 },
    );
    await waitFor(() => expect(body.queryByTestId('create-object-form')).toBeNull());
  },
};

/** With the required name blank, Enter creates nothing and leaves the dialog open. */
export const DraftEnterInvalid: Story = {
  args: { mode: 'draft' },
  play: async () => {
    const body = within(document.body);
    const name = await body.findByLabelText(/^name$/i, undefined, { timeout: 15_000 });
    await userEvent.clear(name);
    await userEvent.keyboard('{Enter}');

    await expect(body.getByTestId('counts')).toHaveTextContent('objects:0 settled:pending');
    await expect(body.getByTestId('create-object-form')).toBeInTheDocument();
  },
};

/** The Create button submits the draft. */
export const DraftCreateButton: Story = {
  args: { mode: 'draft' },
  play: async () => {
    const body = within(document.body);
    const form = await body.findByTestId('create-object-form', undefined, { timeout: 15_000 });
    await userEvent.click(within(form).getByTestId('save-button'));

    await waitFor(
      async () => expect(await body.findByTestId('counts')).toHaveTextContent('objects:1 settled:committed'),
      { timeout: 5_000 },
    );
  },
};

/** The Cancel button closes the dialog without creating anything. */
export const DraftCancelButton: Story = {
  args: { mode: 'draft' },
  play: async () => {
    const body = within(document.body);
    const form = await body.findByTestId('create-object-form', undefined, { timeout: 15_000 });
    await userEvent.click(within(form).getByTestId('cancel-button'));

    await waitFor(
      async () => expect(await body.findByTestId('counts')).toHaveTextContent('objects:0 settled:dismissed'),
      { timeout: 5_000 },
    );
    await expect(body.queryByTestId('create-object-form')).toBeNull();
  },
};

/** Escape from a field closes the dialog without creating anything. */
export const DraftEscapeCancels: Story = {
  args: { mode: 'draft' },
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByLabelText(/^name$/i, undefined, { timeout: 15_000 }));
    await userEvent.keyboard('{Escape}');

    await waitFor(
      async () => expect(await body.findByTestId('counts')).toHaveTextContent('objects:0 settled:dismissed'),
      { timeout: 5_000 },
    );
    await expect(body.queryByTestId('create-object-form')).toBeNull();
  },
};
