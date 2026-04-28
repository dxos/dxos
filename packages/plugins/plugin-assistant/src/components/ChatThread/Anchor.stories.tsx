//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Database, Filter, Obj } from '@dxos/echo';
import { DxAnchor } from '@dxos/lit-ui/react';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Organization } from '@dxos/types';

/**
 * Production-style click → popover demo.
 *
 * Wires up the same chain Composer uses:
 * - `<DxAnchor dxn=…>label</DxAnchor>` fires `DxAnchorActivate` on click.
 * - `PreviewPlugin`'s `preview-popover` capability listens for the event, resolves the DXN
 *   to a real ECHO object via `space.db.makeRef(dxn).load()`, then invokes
 *   `LayoutOperation.UpdatePopover`.
 * - `StorybookPlugin` provides both the `LayoutOperation.UpdatePopover` handler (mutating
 *   the layout-state atom) and the `<Layout>` shell that renders the popover via
 *   `<Surface.Surface type={AppSurface.Card} data={popoverContent}>`.
 * - `PreviewPlugin` also registers Card-role surfaces (Organization, Person, Task, …); the
 *   Surface system picks the matching one based on the resolved object's type.
 *
 * Click the anchor — the matching Card surface (from plugin-preview) renders inside the
 * popover, anchored to the trigger.
 */
const DefaultStory = () => {
  const [space] = useSpaces();
  const [organization] = useQuery(space?.db, Filter.type(Organization.Organization));
  if (!organization) {
    return <Loading />;
  }

  const dxn = Obj.getDXN(organization).toString();
  return (
    <div role='none' className='flex flex-col gap-2 p-4'>
      <p>
        Click{' '}
        <DxAnchor className='dx-tag--anchor' dxn={dxn}>
          {organization.name}
        </DxAnchor>{' '}
        to open the popover.
      </p>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatThread/Anchor',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'centered' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        PreviewPlugin(),
        ClientPlugin({
          types: [Organization.Organization],
          onClientInitialized: Effect.fnUntraced(function* ({ client }) {
            const { personalSpace } = yield* initializeIdentity(client);
            yield* Effect.gen(function* () {
              yield* Database.add(
                Obj.make(Organization.Organization, {
                  name: 'DXOS',
                  website: 'https://dxos.org',
                  description: 'A decentralized network for collaborative applications.',
                }),
              );
            }).pipe(Effect.provide(Database.layer(personalSpace.db)));
          }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
