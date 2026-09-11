//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useSpace } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider, withMultiClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Task } from '@dxos/types';

import { CanonicalTaskPanel, LensedGtdPanel, RawInspector } from '../components.tsx';
import { makeDemoTask } from '../gtd.ts';
import { control, selectOption, selectValue, typeInto } from '../testing.ts';

//
// One object, viewed through two interfaces.
//
// `SideBySide` puts both interfaces and a raw inspector on one peer, so the third pane shows every
// lensed edit landing in the base object under its own schema. `Collaboration` gives each interface
// its own peer, replicating over a real invitation, which is where write-minimality is load-bearing:
// a snapshot-style lens write would clobber the other peer's concurrent edit.
//

const useDemoTask = () => {
  const { spaceId } = useClientStory();
  const space = useSpace(spaceId);
  const [task] = useQuery(space?.db, Query.type(Task.Task));
  return task;
};

const SideBySideStory = () => {
  const task = useDemoTask();
  if (!task) {
    return <Loading />;
  }

  return (
    <div className='dx-fullscreen grid grid-cols-3 gap-3 p-3 overflow-hidden'>
      <CanonicalTaskPanel task={task} />
      <LensedGtdPanel task={task} />
      <RawInspector task={task} />
    </div>
  );
};

/**
 * Each peer renders ONE interface: peer 0 the canonical one, peer 1 the lensed one. They are separate
 * clients joined by a real invitation, so everything crossing between the columns crossed the network.
 */
const CollaborationStory = () => {
  const { index } = useClientStory();
  const task = useDemoTask();
  if (!task) {
    return <Loading />;
  }

  return (
    <div className='grid grid-rows-2 gap-3 p-3 h-full overflow-hidden'>
      {index === 0 ? <CanonicalTaskPanel task={task} /> : <LensedGtdPanel task={task} />}
      <RawInspector task={task} />
    </div>
  );
};

const onCreateSpace = async ({ space }: { space: { db: { add: (obj: any) => any } } }) => {
  space.db.add(makeDemoTask());
};

const meta: Meta = {
  title: 'stories/stories-lens/ObjectLens',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

const singlePeer = withClientProvider({
  createIdentity: true,
  createSpace: true,
  types: [Task.Task],
  onCreateSpace,
});

const twoPeers = withMultiClientProvider({
  numClients: 2,
  createIdentity: true,
  createSpace: true,
  types: [Task.Task],
  onCreateSpace,
});

/**
 * Both interfaces on one peer, next to the object they share. Edit either side and watch the third
 * pane: every lensed change is an ordinary property write, and the target-only fields land in the
 * object's annotations.
 */
export const Default: Story = {
  render: SideBySideStory,
  decorators: [singlePeer],
};

/**
 * The assertions behind {@link Default}.
 */
export const Spec: Story = {
  render: SideBySideStory,
  decorators: [singlePeer],
  play: async ({ canvasElement }) => {
    const find = <T extends HTMLElement>(testId: string) =>
      canvasElement.querySelector<T>(`[data-testid="${testId}"]`)!;

    await waitFor(() => expect(find('lensed-panel')).toBeInTheDocument(), { timeout: 15_000 });
    const canonical = find('canonical-panel');
    const lensed = find('lensed-panel');

    // The lens reports the object as its TARGET type; the inspector reports the base object's own.
    await expect(find('inspector-typename')).toHaveTextContent('org.dxos.type.task');

    // Both panels are the same `Form` component and differ only in the schema they are given, so the
    // fields are addressed by their schema-declared labels — all a form consumer knows about them.
    // `status: 'started'` reads as `done: false` through the lens.
    await expect(control(lensed, 'Done')).not.toBeChecked();
    await expect(selectValue(lensed, 'Stage')).toBe('started');

    // Completing it through the lens writes `status` on the base object — visible in both other panes.
    await userEvent.click(control(lensed, 'Done'));
    await waitFor(async () => {
      await expect(selectValue(canonical, 'Status')).toBe('done');
      await expect(find('inspector-properties')).toHaveTextContent('"status": "done"');
    });

    // A canonical edit shows through the lens, in the other direction.
    await selectOption(canonical, 'Status', 'todo');
    await waitFor(async () => {
      await expect(control(lensed, 'Done')).not.toBeChecked();
      await expect(selectValue(lensed, 'Stage')).toBe('todo');
    });

    // An overlay property — nothing on `Task` corresponds — lands in the object's annotations.
    await selectOption(lensed, 'Context', '@work');
    await waitFor(async () => {
      await expect(find('inspector-overlay')).toHaveTextContent('"context": "@work"');
      // ...and NOT as a property of the base object.
      await expect(find('inspector-properties')).not.toHaveTextContent('"context"');
    });

    // A lensed rename is an ordinary `title` write on the base object.
    await typeInto(lensed, 'Title', 'Renamed through the lens');
    await waitFor(async () => {
      await expect(control<HTMLInputElement>(canonical, 'Title')).toHaveValue('Renamed through the lens');
      await expect(find('inspector-properties')).toHaveTextContent('"title": "Renamed through the lens"');
    });
  },
};

/**
 * Two peers, one object: the canonical interface on one, the lensed interface on the other, replicating
 * live over a real invitation. The single-peer {@link Spec} carries the assertions; this one is for
 * watching a lensed edit cross the network into a canonical form written against a different schema.
 */
export const Collaboration: Story = {
  render: CollaborationStory,
  decorators: [twoPeers],
};
