//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import React from 'react';

import { ObservableArray, ObservableObject } from '@dxos/observable-object';
import { PluginContextProvider, Surface, ThemePlugin } from '@dxos/react-surface';

import { KanbanPlugin } from '../KanbanPlugin';
import { KanbanModel, KanbanColumn, KanbanItem } from '../props';

faker.seed(1);

const DefaultKanbanPluginStory = () => {
  const object = new ObservableObject<KanbanModel>({
    id: 'test',
    title: faker.lorem.words(3),
    columns: new ObservableArray<KanbanColumn>(
      ...faker.datatype.array(faker.datatype.number({ min: 2, max: 8 })).map(() => ({
        id: 'column-' + faker.datatype.uuid(),
        title: faker.lorem.words(3),
        items: new ObservableArray<KanbanItem>(
          ...faker.datatype.array(faker.datatype.number(8)).map(() => ({
            id: 'item-' + faker.datatype.uuid(),
            content: faker.lorem.words(faker.datatype.number({ min: 3, max: 8 })) + '.',
          })),
        ),
      })),
    ),
  });

  return (
    // TODO(burdon): Factor out container.
    <div className='flex overflow-hidden absolute left-0 right-0 top-0 bottom-0'>
      <Surface role='main' data={[object]} />
    </div>
  );
};

const KanbanPluginStoryPlugin = {
  meta: {
    id: 'dxos.org/plugin/KanbanPluginStoryPlugin', // TODO(burdon): Consistent GUID? (see stack).
  },
  provides: {
    components: {
      default: DefaultKanbanPluginStory,
    },
  },
};

const KanbanSurfacesApp = () => (
  <PluginContextProvider plugins={[ThemePlugin, KanbanPlugin, KanbanPluginStoryPlugin]} />
);

export default {
  component: KanbanSurfacesApp,
};

export const Default = {
  args: {},
};
