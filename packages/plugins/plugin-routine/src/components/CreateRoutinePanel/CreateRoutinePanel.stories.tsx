//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as Instructions from '@dxos/compute/Instructions';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Obj } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { RoutineCapabilities } from '#types';

import { CreateRoutinePanel } from './CreateRoutinePanel';

const types = [Routine.Routine, Trigger.Trigger, Instructions.Instructions];

type SubmittedPayload = { templateId?: string; draft?: unknown };

// Exposes the submitted create payload to the play functions — module scope is shared between the
// story render and its play, so no window global (and no cast) is needed.
let submittedPayload: SubmittedPayload | undefined;

// Accessor defeats control-flow narrowing from the plays' reset assignment.
const submitted = (): SubmittedPayload | undefined => submittedPayload;

const DefaultStory = ({ initialFormValues }: { initialFormValues?: Record<string, any> }) => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  if (!space) {
    return <Loading />;
  }

  return (
    <CreateRoutinePanel
      target={space.db}
      initialFormValues={initialFormValues}
      onCreateObject={(data) => {
        submittedPayload = data;
      }}
    />
  );
};

const withRoutinePlugins = () =>
  withPluginManager({
    plugins: [
      ...corePlugins(),
      ClientPlugin.make({
        types,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* Effect.promise(() => client.halo.createIdentity());
            const space = yield* Effect.promise(() => client.spaces.create());
            yield* Effect.promise(() => space.waitUntilReady());
          }),
      }),
      RoutinePlugin(),
    ],
  });

const meta = {
  title: 'plugins/plugin-routine/components/CreateRoutinePanel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Template picker (the Blank template is contributed by the plugin itself). */
export const Default: Story = {
  decorators: [withRoutinePlugins()],
};

/**
 * Two-step create flow: pick the Blank template, edit the routine in the full form, and Save —
 * submitting `{ templateId, draft }` with the (unpersisted) scaffolded routine graph.
 */
export const CreateFromTemplate: Story = {
  decorators: [withRoutinePlugins()],
  play: async ({ canvasElement }) => {
    submittedPayload = undefined;
    const canvas = within(canvasElement);

    // Step 1: the picker lists the Blank template; selecting it scaffolds a draft.
    const item = await canvas.findByText('Blank', undefined, { timeout: 10_000 });
    await userEvent.click(item);

    // Step 2: the routine form renders over the draft with a Save/Cancel row.
    const save = await canvas.findByTestId('save-button', undefined, { timeout: 10_000 });
    await userEvent.click(save);

    // The save handler submits asynchronously; retry until the payload lands.
    await waitFor(() => expect(submitted()?.templateId).toBe(RoutineCapabilities.BlankTemplateId));
    await expect(Obj.instanceOf(Routine.Routine, submitted()?.draft)).toBe(true);
  },
};

/**
 * Seeded flow: `initialFormValues.templateId` skips the picker and opens the form over the named
 * template's draft immediately (the connector flow seeds its sync template this way).
 */
export const Seeded: Story = {
  args: {
    initialFormValues: { templateId: RoutineCapabilities.BlankTemplateId },
  },
  decorators: [withRoutinePlugins()],
  play: async ({ canvasElement }) => {
    submittedPayload = undefined;
    const canvas = within(canvasElement);

    // The form (not the picker) is the first thing shown.
    await canvas.findByTestId('save-button', undefined, { timeout: 10_000 });
    await expect(canvas.queryByTestId('create-automation-panel.template-input')).toBeNull();

    // Cancel falls back to the picker.
    const cancel = await canvas.findByTestId('cancel-button');
    await userEvent.click(cancel);
    await canvas.findByTestId('create-automation-panel.template-input', undefined, { timeout: 10_000 });
  },
};
