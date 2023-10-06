//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React from 'react';

import { PublicKey } from '@dxos/react-client';
import { Expando } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { EchoKanban } from './DemoKanban';
import { GraphTree } from './DemoTree';
import { Mosaic } from '../../mosaic';
import { FullscreenDecorator, Generator, Status } from '../../testing';

faker.seed(3);
const debug = true;

export default {
  title: 'Demo',
};

// TODO(wittjosiah): This currently has a bug where empty over events are fired when dragging from tree onto kanban.
//   The bug didn't exist before the cleanup refactor so seems likely it's a side effect of that.
export const GraphEcho = {
  render: ({ spaceKey }: { spaceKey: PublicKey }) => (
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      <div className='flex grow overflow-hidden'>
        <div className='flex shrink-0 w-[280px] overflow-hidden'>
          <GraphTree debug={debug} />
        </div>
        <div className='flex grow overflow-hidden'>
          <EchoKanban spaceKey={spaceKey} debug={debug} />
        </div>
      </div>
    </Mosaic.Root>
  ),
  decorators: [
    FullscreenDecorator(),
    ClientSpaceDecorator({
      onCreateSpace: async (space) => {
        const generator = new Generator(space);
        await generator.initialize();
        const { project } = generator.createProjects();
        space.db.add(
          new Expando({
            type: 'kanban',
            title: 'Projects',
            schema: project,
            columnBy: 'status',
            order: Status,
            columnOrder: {},
          }),
        );
      },
    }),
  ],
};
