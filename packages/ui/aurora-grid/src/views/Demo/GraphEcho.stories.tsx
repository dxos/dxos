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
import { Generator, Status } from '../../testing';

faker.seed(3);
const debug = true;

export default {
  title: 'Demo',
};

export const GraphEcho = {
  render: ({ spaceKey }: { spaceKey: PublicKey }) => (
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      <div className='flex grow overflow-hidden'>
        <div className='flex shrink-0 w-[280px] overflow-hidden'>
          <GraphTree debug={debug} />
        </div>
        <div className='flex grow overflow-hidden bg-neutral-900'>
          <EchoKanban spaceKey={spaceKey} debug={debug} />
        </div>
      </div>
    </Mosaic.Root>
  ),
  decorators: [
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
