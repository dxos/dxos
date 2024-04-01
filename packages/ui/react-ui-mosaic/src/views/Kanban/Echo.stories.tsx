//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PublicKey } from '@dxos/react-client';
// import { Expando } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { Kanban } from './Kanban';
// import { EchoKanban, columnValues } from './testing';
import { Mosaic } from '../../mosaic';
import { FullscreenDecorator /* TestObjectGenerator, range */ } from '../../testing';

// const generator = new TestObjectGenerator();

const Story = ({
  // TODO(wittjosiah): Can't use id because of ClientSpaceDecorator.
  basePath = 'projects',
  spaceKey,
  debug,
}: {
  basePath: string;
  spaceKey: PublicKey;
  debug: boolean;
}) => {
  return (
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      {/* <EchoKanban id={basePath} spaceKey={spaceKey} generator={generator} debug={debug} /> */}
    </Mosaic.Root>
  );
};

export default {
  title: 'react-ui-mosaic/Kanban',
  component: Kanban,
  render: () => (
    <ClientRepeater
      // onCreateSpace={async (space) => {
      //   const factory = generator.factories.project;
      //   const objects = [
      //     factory.schema,
      //     ...range(factory.createObject, 10),
      //     new Expando({
      //       type: 'kanban',
      //       title: 'Projects',
      //       schema: factory.schema,
      //       // TODO(burdon): Standardize with other story.
      //       columnProp: 'status',
      //       columnValues: columnValues.status,
      //       objectPosition: {}, // TODO(burdon): Make this a CRDT.
      //     }),
      //   ];

      //   // TODO(burdon): Batch API.
      //   objects.forEach((object) => space.db.add(object));
      // }}
      component={Story}
      createSpace
    />
  ),
  decorators: [withTheme, FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const ECHO = {};
