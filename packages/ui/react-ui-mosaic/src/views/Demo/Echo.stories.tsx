//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { faker } from '@dxos/random';
import { type PublicKey } from '@dxos/react-client';
import * as E from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { Mosaic } from '../../mosaic';
import { FullscreenDecorator, TestObjectGenerator, range, Status, Priority } from '../../testing';
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

const Story: FC<{ spaceKey: PublicKey }> = ({ spaceKey }) => {
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
  title: 'react-ui-mosaic/Demo',
  render: () => (
    <ClientRepeater
      component={Story}
      onCreateSpace={async (space) => {
        const factory = generator.factories.project;
        const objects = [
          factory.schema,
          ...range(factory.createObject, 10),
          E.object({
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
  decorators: [withTheme, FullscreenDecorator()],
};

// TODO(wittjosiah): This currently has a bug where empty over events are fired when dragging from tree onto kanban.
//   The bug didn't exist before the cleanup refactor so seems likely it's a side effect of that.
// export const ECHO = {};
