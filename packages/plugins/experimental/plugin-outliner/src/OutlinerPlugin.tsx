//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition, createSurface, createIntent, createResolver } from '@dxos/app-framework';
import { create, makeRef, RefArray } from '@dxos/live-object';

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
            loadReferences: async (tree: TreeType) => await RefArray.loadAll([tree.root]),
          },
          [TreeItemType.typename]: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (item: TreeItemType) => await RefArray.loadAll(item.items ?? []),
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
            data: {
              object: create(TreeType, {
                root: makeRef(
                  create(TreeItemType, {
                    content: '',
                    items: [makeRef(create(TreeItemType, { content: '', items: [] }))],
                  }),
                ),
              }),
            },
          })),
          createResolver(OutlinerAction.ToggleCheckbox, ({ object }) => {
            object.checkbox = !object.checkbox;
          }),
        ],
      },
    },
  };
};
