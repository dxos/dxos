//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition, createSurface, createIntent, createResolver } from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { OutlinerMain, TreeSection } from './components';
import meta, { OUTLINER_PLUGIN } from './meta';
import translations from './translations';
import { TreeItemType, TreeType } from './types';
import { OutlinerAction, type OutlinerPluginProvides } from './types';

export const OutlinerPlugin = (): PluginDefinition<OutlinerPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [TreeType.typename]: {
            createObject: (props: { name?: string }) => createIntent(OutlinerAction.Create, props),
            placeholder: ['object placeholder', { ns: OUTLINER_PLUGIN }],
            icon: 'ph--tree-structure--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (tree: TreeType) => loadObjectReferences(tree, (tree) => [tree.root]),
          },
          [TreeItemType.typename]: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (item: TreeItemType) => loadObjectReferences(item, (item) => item.items),
          },
        },
      },
      echo: {
        schema: [TreeType],
        system: [TreeItemType],
      },
      translations,
      surface: {
        definitions: () => [
          createSurface({
            id: `${OUTLINER_PLUGIN}/article`,
            role: 'article',
            filter: (data): data is { subject: TreeType } => data.subject instanceof TreeType,
            component: ({ data }) => <OutlinerMain tree={data.subject} />,
          }),
          createSurface({
            id: `${OUTLINER_PLUGIN}/section`,
            role: 'section',
            filter: (data): data is { subject: TreeType } => data.subject instanceof TreeType,
            component: ({ data }) => <TreeSection tree={data.subject} />,
          }),
        ],
      },
      intent: {
        resolvers: () => [
          createResolver(OutlinerAction.Create, ({ name }) => ({
            data: { object: create(TreeType, { root: create(TreeItemType, { content: name || '', items: [] }) }) },
          })),
          createResolver(OutlinerAction.ToggleCheckbox, ({ object }) => {
            object.checkbox = !object.checkbox;
          }),
        ],
      },
    },
  };
};
