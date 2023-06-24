//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { ObservableArray, ObservableObject } from '@dxos/observable-object';
import { PluginContextProvider, Surface, ThemePlugin } from '@dxos/react-surface';

import { KanbanPlugin } from '../KanbanPlugin';

const DefaultKanbanPluginStory = () => {
  const object = new ObservableObject({
    id: 'test', // TODO(burdon): Why?
    title: 'Kanban',
    columns: new ObservableArray(),
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
    // ]),
  });

  return <Surface role='main' data={[object]} />;
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
