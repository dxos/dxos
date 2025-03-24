//
// Copyright 2025 DXOS.org
//

import { format } from 'prettier';
import prettierPluginEstree from 'prettier/plugins/estree';
import prettierPluginTypescript from 'prettier/plugins/typescript';
import { useCallback } from 'react';

import { type ScriptType } from '@dxos/functions/types';
import { log } from '@dxos/log';
import { createMenuAction } from '@dxos/react-ui-menu';

import { SCRIPT_PLUGIN } from '../meta';

export type FormatActionProperties = { type: 'format' };

export const createFormat = () => {
  const formatAction = createMenuAction('format', {
    label: ['format label', { ns: SCRIPT_PLUGIN }],
    icon: 'ph--magic-wand--regular',
  });

  return {
    nodes: [formatAction],
    edges: [{ source: 'root', target: 'format' }],
  };
};

export const useFormatHandler = ({ script }: { script: ScriptType }) =>
  useCallback(async () => {
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
  }, [script.source]);
