//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import React from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { PluginContextProvider, Surface } from '@dxos/react-surface';

import { KanbanPlugin } from '../KanbanPlugin';
import { createKanban } from './testing';

faker.seed(1);

const DefaultKanbanPluginStory = () => {
  const object = createKanban();
  return (
    // TODO(burdon): Factor out container.
    <div className='flex overflow-hidden absolute left-0 right-0 top-0 bottom-0'>
      <Surface role='main' data={object} />
    </div>
  );
};

const KanbanPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/KanbanPluginStoryPlugin', // TODO(burdon): Consistent GUID? (see stack).
  },
  provides: {
    components: {
      default: DefaultKanbanPluginStory,
    },
  },
});

const KanbanSurfacesApp = () => (
  <PluginContextProvider plugins={[ThemePlugin(), KanbanPlugin(), KanbanPluginStoryPlugin()]} />
);

export default {
  component: KanbanSurfacesApp,
};

export const Default = {
  args: {},
};
