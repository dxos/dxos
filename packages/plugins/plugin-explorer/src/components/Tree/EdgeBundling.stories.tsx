//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Query } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ValueGenerator } from '@dxos/schema/testing';
import { HasConnection, Organization, Person } from '@dxos/types';

import { buildOrgHierarchy, connectionsToEdges, generateConnectedOrgs } from '../../testing';
import { type TreeComponentProps, Tree } from './Tree';
import { type TreeNode } from './types';

const generator = random as any as ValueGenerator;

random.seed(42);

const DefaultStory = ({ variant = 'edge', tension }: { variant?: TreeComponentProps['variant']; tension?: number }) => {
  const [space] = useSpaces();
  const [{ data, edges }, setState] = useState<{ data?: TreeNode; edges: TreeComponentProps['edges'] }>({
    data: undefined,
    edges: [],
  });
  const [hovered, setHovered] = useState<TreeNode | null>(null);

  useEffect(() => {
    if (!space) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const orgs = await space.db.query(Query.type(Organization.Organization)).run();
      if (cancelled || !orgs.length) {
        return;
      }
      const connections = await space.db.query(Query.type(HasConnection.HasConnection)).run();
      if (cancelled) {
        return;
      }
      setState({
        data: buildOrgHierarchy(orgs as any),
        edges: connectionsToEdges(connections as any),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [space]);

  const slots = useMemo<TreeComponentProps['slots']>(
    () => ({
      node: 'fill-neutral-700 dark:fill-neutral-300',
      path: 'stroke-orange-400/40 dark:stroke-orange-500/40',
      text: 'fill-neutral-700 dark:fill-neutral-200 text-xs',
    }),
    [],
  );

  if (!space || !data) {
    return <Loading data={{ space: !!space, data: !!data }} />;
  }

  return (
    <div className='relative flex h-full w-full'>
      <Tree
        data={data}
        edges={edges}
        variant={variant}
        slots={slots}
        onNodeHover={setHovered}
        // Pass-through; only `edge` variant uses `edges`/`onNodeHover`.
      />
      {hovered && (
        <div className='pointer-events-none absolute left-2 top-2 rounded bg-neutral-900/80 px-2 py-1 text-xs text-white dark:bg-white/80 dark:text-neutral-900'>
          {hovered.label ?? hovered.id}
        </div>
      )}
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-explorer/components/EdgeBundling',
  component: Tree as any,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Organization.Organization, Person.Person, HasConnection.HasConnection],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() =>
                generateConnectedOrgs(personalSpace, generator, {
                  organizationCount: 16,
                  personCount: 24,
                  connectionCount: 22,
                }),
              );
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'edge',
  },
};

export const Tidy: Story = {
  args: {
    variant: 'tidy',
  },
};

export const Radial: Story = {
  args: {
    variant: 'radial',
  },
};
