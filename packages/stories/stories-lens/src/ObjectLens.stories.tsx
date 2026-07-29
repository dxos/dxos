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
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Task } from '@dxos/types';

import { CanonicalTaskPanel, LensedGtdPanel, RawInspector } from './components';
import { makeDemoTask } from './gtd';

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
    return <div className='p-3 text-sm text-subdued'>Loading…</div>;
  }

  return (
    <div className='absolute inset-0 grid grid-cols-3 gap-3 p-3 overflow-hidden'>
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
    return <div className='p-3 text-sm text-subdued'>Loading…</div>;
  }

  return (
    <div className='flex flex-col gap-3 p-3 h-full overflow-auto'>
      <div className='text-xs text-subdued'>peer {index}</div>
      {index === 0 ? <CanonicalTaskPanel task={task} /> : <LensedGtdPanel task={task} />}
      <RawInspector task={task} />
    </div>
  );
};

const onCreateSpace = async ({ space }: { space: { db: { add: (obj: any) => any } } }) => {
  space.db.add(makeDemoTask());
};

const meta: Meta = {
  title: 'stories/lens/ObjectLens',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Both interfaces on one peer, next to the object they share.
 */
export const SideBySide: Story = {
  render: SideBySideStory,
  decorators: [withClientProvider({ createIdentity: true, createSpace: true, types: [Task.Task], onCreateSpace })],
  play: async ({ canvasElement }) => {
    const find = <T extends HTMLElement>(testId: string) =>
      canvasElement.querySelector<T>(`[data-testid="${testId}"]`)!;

    await waitFor(() => expect(find('lensed-panel')).toBeInTheDocument(), { timeout: 15_000 });

    // The lens reports the object as its TARGET type; the inspector reports the base object's own.
    await expect(find('inspector-typename')).toHaveTextContent('org.dxos.type.task');

    // `status: 'in-progress'` reads as `done: false` through the lens.
    const done = find<HTMLInputElement>('lensed-done');
    await expect(done.checked).toBe(false);
    await expect(find('lensed-panel')).toHaveTextContent('stage: in-progress');

    // Completing it through the lens writes `status` on the base object — visible in both other panes.
    await userEvent.click(done);
    await waitFor(async () => {
      await expect(find<HTMLSelectElement>('canonical-status').value).toBe('done');
      await expect(find('inspector-properties')).toHaveTextContent('"status": "done"');
    });

    // A canonical edit shows through the lens, in the other direction.
    await userEvent.selectOptions(find<HTMLSelectElement>('canonical-status'), 'todo');
    await waitFor(async () => {
      await expect(find<HTMLInputElement>('lensed-done').checked).toBe(false);
      await expect(find('lensed-panel')).toHaveTextContent('stage: todo');
    });

    // An overlay property — nothing on `Task` corresponds — lands in the object's annotations.
    await userEvent.selectOptions(find<HTMLSelectElement>('lensed-context'), '@work');
    await waitFor(async () => {
      await expect(find('inspector-overlay')).toHaveTextContent('"context": "@work"');
      // ...and NOT as a property of the base object.
      await expect(find('inspector-properties')).not.toHaveTextContent('"context"');
    });
  },
};

/**
 * Two peers, one object: the canonical interface on one, the lensed interface on the other,
 * replicating live.
 */
export const Collaboration: Story = {
  render: CollaborationStory,
  decorators: [
    withMultiClientProvider({
      numClients: 2,
      createIdentity: true,
      createSpace: true,
      types: [Task.Task],
      onCreateSpace,
    }),
  ],
  play: async ({ canvasElement }) => {
    const findAll = <T extends HTMLElement>(testId: string) =>
      Array.from(canvasElement.querySelectorAll<T>(`[data-testid="${testId}"]`));

    // Identity creation, space creation, and the invitation are all async.
    await waitFor(
      async () => {
        await expect(findAll('canonical-panel')).toHaveLength(1);
        await expect(findAll('lensed-panel')).toHaveLength(1);
      },
      { timeout: 30_000 },
    );

    const [canonicalTitle] = findAll<HTMLInputElement>('canonical-title');
    const [lensedDone] = findAll<HTMLInputElement>('lensed-done');
    const [lensedContext] = findAll<HTMLSelectElement>('lensed-context');

    // The seeded object replicated to the guest, and the lens projects it there.
    await expect(lensedDone.checked).toBe(false);

    // Peer 1 completes the task through the lens; peer 0 sees `status` change on the canonical form.
    await userEvent.click(lensedDone);
    await waitFor(async () => await expect(findAll<HTMLSelectElement>('canonical-status')[0].value).toBe('done'), {
      timeout: 15_000,
    });

    // Peer 1 sets an overlay property; it replicates as part of the object's own metadata.
    await userEvent.selectOptions(lensedContext, '@errands');
    await waitFor(
      async () => {
        for (const overlay of findAll('inspector-overlay')) {
          await expect(overlay).toHaveTextContent('"context": "@errands"');
        }
      },
      { timeout: 15_000 },
    );

    // Peer 0 renames through the canonical interface; peer 1's lensed title follows...
    await userEvent.clear(canonicalTitle);
    await userEvent.type(canonicalTitle, 'Renamed by the canonical UI');
    await waitFor(
      async () => await expect(findAll<HTMLInputElement>('lensed-title')[0].value).toBe('Renamed by the canonical UI'),
      { timeout: 15_000 },
    );

    // ...and the lensed edit from before survived it. A lens write that assigned the whole object
    // would have reverted this rename; this assertion is what makes write-minimality observable.
    await expect(findAll<HTMLSelectElement>('canonical-status')[0].value).toBe('done');
    await expect(findAll<HTMLInputElement>('lensed-done')[0].checked).toBe(true);
  },
};
