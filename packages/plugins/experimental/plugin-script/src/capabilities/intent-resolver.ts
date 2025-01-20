//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { ScriptType } from '@dxos/functions';
import { create, makeRef } from '@dxos/live-object';
import { TextType } from '@dxos/schema';

import { templates } from '../templates';
import { ScriptAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver(ScriptAction.Create, ({ name }) => ({
      data: {
        object: create(ScriptType, {
          source: makeRef(
            create(TextType, {
              content: templates[0].source,
            }),
          ),
        }),
      },
    })),
  );
