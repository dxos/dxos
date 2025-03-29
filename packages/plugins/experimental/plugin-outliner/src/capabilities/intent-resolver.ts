//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { create, makeRef } from '@dxos/live-object';

import { TreeType, TreeNodeType, OutlinerAction } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: OutlinerAction.Create,
      resolve: ({ name }) => ({
        data: {
          object: create(TreeType, {
            name,
            root: makeRef(
              create(TreeNodeType, {
                text: '',
                children: [makeRef(create(TreeNodeType, { text: '', children: [] }))],
              }),
            ),
          }),
        },
      }),
    }),
    createResolver({
      intent: OutlinerAction.ToggleCheckbox,
      resolve: ({ object }) => {
        object.checkbox = !object.checkbox;
      },
    }),
  ]);
