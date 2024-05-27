//
// Copyright 2023 DXOS.org
//

import { Function, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { FunctionDef, FunctionTrigger } from '@dxos/functions/types';

import { TriggerArticle } from './components';
import meta, { FUNCTION_PLUGIN } from './meta';
import translations from './translations';
import { FunctionAction, type FunctionPluginProvides } from './types';

export const FunctionPlugin = (): PluginDefinition<FunctionPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [FunctionTrigger.typename]: {
            placeholder: ['object placeholder', { ns: FUNCTION_PLUGIN }],
            icon: (props: IconProps) => <Function {...props} />,
          },
        },
      },
      translations,
      echo: {
        schema: [FunctionDef, FunctionTrigger],
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-function',
            testId: 'functionPlugin.createSectionSpaceFunction',
            label: ['create stack section label', { ns: FUNCTION_PLUGIN }],
            icon: (props: any) => <Function {...props} />,
            intent: {
              plugin: FUNCTION_PLUGIN,
              action: FunctionAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'section': {
              return data.object instanceof FunctionTrigger ? <TriggerArticle trigger={data.object} /> : null;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case FunctionAction.CREATE: {
              return {
                // TODO(burdon): Props should be undefined.
                data: create(FunctionTrigger, { function: '', spec: { type: 'timer', cron: '' } }),
              };
            }
          }
        },
      },
    },
  };
};
