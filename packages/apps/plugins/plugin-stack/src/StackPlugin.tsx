//
// Copyright 2023 DXOS.org
//

import { StackSimple, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { Collection, Section, StackView } from '@braneframe/types';
import { resolvePlugin, type Plugin, type PluginDefinition } from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import { Filter, create } from '@dxos/echo-schema';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';

import { StackMain, StackSettings, AddSectionDialog, dataHasAddSectionDialogProps } from './components';
import meta, { STACK_PLUGIN } from './meta';
import translations from './translations';
import { type StackPluginProvides, type StackProvides, type StackState, type StackSettingsProps } from './types';

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const settings = new LocalStorageStore<StackSettingsProps>(STACK_PLUGIN, { separation: true });
  const stackState = create<StackState>({ creators: [], stacks: [] });
  let subscription: UnsubscribeCallback;

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({ key: 'separation', type: LocalStorageStore.bool() });

      for (const plugin of plugins) {
        if (plugin.meta.id === STACK_PLUGIN) {
          continue;
        }

        if (Array.isArray((plugin as Plugin<StackProvides>).provides?.stack?.creators)) {
          stackState.creators.push(...((plugin as Plugin<StackProvides>).provides.stack.creators ?? []));
        }
      }

      const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
      if (client) {
        const query = client.spaces.query(Filter.schema(StackView));
        subscription = query.subscribe(({ objects }) => {
          stackState.stacks.splice(0, stackState.stacks.length, ...objects);
        });
      }
    },
    unload: async () => {
      subscription?.();
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [StackView.typename]: {
            placeholder: ['stack title placeholder', { ns: STACK_PLUGIN }],
            icon: (props: IconProps) => <StackSimple {...props} />,
          },
          [Section.identifier]: {
            parse: (object: EchoReactiveObject<any>, type: string) => {
              switch (type) {
                case 'node':
                  // TODO(wittjosiah): Remove cast.
                  return { id: object.id, label: object.title, data: object };
                case 'object':
                  return object;
              }
            },
          },
        },
      },
      translations,
      echo: {
        schema: [StackView],
      },
      surface: {
        component: ({ data, role }) => {
          switch (data.component) {
            case `${STACK_PLUGIN}/AddSectionDialog`:
              return dataHasAddSectionDialogProps(data) ? <AddSectionDialog {...data.subject} /> : null;
          }
          switch (role) {
            case 'main': {
              const collection = data.active instanceof Collection ? data.active : null;
              const stack = stackState.stacks.find((stack) => stack.collection?.id === collection?.id);
              console.log({ stack, collection: collection?.id, stacks: stackState.stacks.map((stack) => stack.id) });
              // find or create stack view
              // create computed utility to map stack view + collection + other data into stack schema
              //   - this will resolve the fallback title issue
              //   - this will resolve the custom actions issue (pull custom actions from metadata plugin)
              //   - provide record in stack section schema for arbitrary view data
              // how do mutations map back to echo?
              return stack ? <StackMain stack={stack} separation={settings.values.separation} /> : null;
            }
            case 'settings': {
              return data.plugin === meta.id ? <StackSettings settings={settings.values} /> : null;
            }
            default:
              return null;
          }
        },
      },
      stack: stackState,
    },
  };
};
