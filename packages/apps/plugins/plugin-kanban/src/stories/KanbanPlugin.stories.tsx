//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { ObservableArray, ObservableObject } from '@dxos/observable-object';
import { PluginContextProvider, Surface, ThemePlugin } from '@dxos/react-surface';

import { KanbanPlugin } from '../KanbanPlugin';
import { KanbanModel } from '../props';

const DefaultKanbanPluginStory = () => {
  const object = new ObservableObject<KanbanModel>({
    id: 'test', // TODO(burdon): Why?
    title: 'Kanban',
    columns: new ObservableArray<KanbanColumn>([
      {
        id: 'column-1',
        title: 'Column 1',
        // items: new ObservableArray<KanbanItem>()
      },
      //     items: new ObservableArray<KanbanItem>([
      //       {
      //         id: 'item-1',
      //         title: 'III',
      //       },
      //     ]),
      //   },
      // TODO(burdon): Set data?
      // columns: new ObservableArray([
      //   {
      //     id: 'column-1',
      //     title: 'Column 1',
      //     items: [
      //       {
      //         id: 'item-1',
      //         title: 'Item 1',
      //       },
      //     ],
      //   },
      //   {
      //     id: 'column-2',
      //     title: 'Column 2',
      //   },
      //   {
      //     id: 'column-3',
      //     title: 'Column 3',
      //   },
    ]),
  });

  // object.columns.push({
  //   id: 'column-1',
  //   title: 'Column 1',
  //   items: new ObservableArray([
  //     {
  //       id: 'item-1',
  //       title: 'III',
  //     },
  //   ]),
  // });

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
