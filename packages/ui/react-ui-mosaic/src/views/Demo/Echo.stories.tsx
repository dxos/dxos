//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { faker } from '@dxos/random';
import { create } from '@dxos/react-client/echo';
import { type ClientRepeatedComponentProps, ClientRepeater } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';
import { range } from '@dxos/util';

import { Mosaic } from '../../mosaic';
import { TestObjectGenerator, Status, Priority } from '../../testing';

// import { EchoKanban } from '../Kanban/testing';
// import { GraphTree } from '../Tree/testing';

faker.seed(3);
const debug = true;
const generator = new TestObjectGenerator();

// TODO(burdon): Compute this?
const columnValues: { [property: string]: any[] } = {
  status: ['unknown', ...Status],
  priority: ['unknown', ...Priority],
};

const Story = ({ spaceKey }: ClientRepeatedComponentProps) => {
  return (
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      <div className='flex grow overflow-hidden'>
        <div className='flex shrink-0 w-[280px] overflow-hidden'>{/* <GraphTree id='graph' debug={debug} /> */}</div>
        <div className='flex grow overflow-hidden'>
          {/* <EchoKanban id='projects' spaceKey={spaceKey} generator={generator} debug={debug} /> */}
        </div>
      </div>
    </Mosaic.Root>
  );
};

export default {
  title: 'ui/react-ui-mosaic/Demo',
  render: () => (
    <ClientRepeater
      component={Story}
      onSpaceCreated={async ({ space }) => {
        const factory = generator.factories.project;
        const objects = [
          factory.schema,
          ...range(10, factory.createObject),
          create({
            type: 'kanban',
            title: 'Projects',
            schema: factory.schema,
            // TODO(burdon): Standardize with other story.
            columnProp: 'status',
            columnValues: columnValues.status,
            objectPosition: {}, // TODO(burdon): Make this a CRDT.
          }),
        ];

        // TODO(burdon): Batch API.
        objects.forEach((object) => space.db.add(object));
      }}
      createSpace
    />
  ),
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

// TODO(wittjosiah): This currently has a bug where empty over events are fired when dragging from tree onto kanban.
//   The bug didn't exist before the cleanup refactor so seems likely it's a side effect of that.
// export const ECHO = {};
