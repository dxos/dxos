//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { create, makeRef } from '@dxos/live-object';

import { TreeType, TreeItemType, OutlinerAction } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
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
  ]);
