//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { FC } from 'react';

import { PublicKey } from '@dxos/react-client';
import { Expando } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { EchoKanban } from './DemoKanban';
import { GraphTree } from './DemoTree';
import { Mosaic } from '../../mosaic';
import { FullscreenDecorator, TestObjectGenerator, range, Status } from '../../testing';

faker.seed(3);
const debug = true;

const Story: FC<{ spaceKey: PublicKey }> = ({ spaceKey }) => {
  return (
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      <div className='flex grow overflow-hidden'>
        <div className='flex shrink-0 w-[280px] overflow-hidden'>
          <GraphTree id='graph' debug={debug} />
        </div>
        <div className='flex grow overflow-hidden'>
          <EchoKanban id='projects' spaceKey={spaceKey} debug={debug} />
        </div>
      </div>
    </Mosaic.Root>
  );
};

export default {
  component: Story,
  title: 'Demo',
  decorators: [
    FullscreenDecorator(),
    ClientSpaceDecorator({
      onCreateSpace: async (space) => {
        const generator = new TestObjectGenerator();
        const factory = generator.factories.project;
        const objects = [
          factory.schema,
          ...range(factory.createObject, 10),
          new Expando({
            type: 'kanban',
            title: 'Projects',
            schema: factory.schema,
            columnBy: 'status',
            order: Status,
            columnOrder: {},
          }),
        ];

        // TODO(burdon): Batch API.
        objects.forEach((object) => space.db.add(object));
      },
    }),
  ],
};

// TODO(wittjosiah): This currently has a bug where empty over events are fired when dragging from tree onto kanban.
//   The bug didn't exist before the cleanup refactor so seems likely it's a side effect of that.
export const ECHO = {};
