//
// Copyright 2025 DXOS.org
//

import { format } from 'prettier';
import prettierPluginEstree from 'prettier/plugins/estree';
import prettierPluginTypescript from 'prettier/plugins/typescript';

import { type ScriptType } from '@dxos/functions';
import { log } from '@dxos/log';
import { createMenuAction } from '@dxos/react-ui-menu';

import { meta } from '../meta';

export type FormatActionProperties = { type: 'format' };

export const createFormat = (script: ScriptType) => {
  const formatAction = createMenuAction(
    'format',
    async () => {
      if (!script.source) {
        return;
      }

      try {
        script.source.target!.content = await format(script.source.target!.content, {
          parser: 'typescript',
          plugins: [prettierPluginEstree, prettierPluginTypescript],
          semi: true,
          singleQuote: true,
        });
      } catch (err: any) {
        // TODO(wittjosiah): Show error in UI.
        log.catch(err);
      }
    },
    {
      label: ['format label', { ns: meta.id }],
      icon: 'ph--magic-wand--regular',
    },
  );

  return {
    nodes: [formatAction],
    edges: [
      {
        source: 'root',
        target: 'format',
      },
    ],
  };
};
