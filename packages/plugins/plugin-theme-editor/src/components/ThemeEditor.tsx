//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useMemo, useState } from 'react';

import {
  MenuProvider,
  ToolbarMenu,
  atomFromSignal,
  createGapSeparator,
  createMenuAction,
  useMenuActions,
} from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';

import { themeEditorId } from '../defs';
import { meta } from '../meta';
import { reset, saveAndRender } from '../util';

import { JsonEditor } from './JsonEditor';

const toolbarCreator = (handleFormat: () => void) =>
  Atom.make((get) =>
    get(
      atomFromSignal(() => {
        const renderAction = createMenuAction('render', () => saveAndRender(), {
          label: ['render label', { ns: meta.id }],
          icon: 'ph--play--regular',
        });
        const formatAction = createMenuAction('format', handleFormat, {
          label: ['format label', { ns: meta.id }],
          icon: 'ph--magic-wand--regular',
        });
        const gap = createGapSeparator();
        const resetAction = createMenuAction('reset', () => reset(), {
          label: ['reset label', { ns: meta.id }],
          icon: 'ph--broom--regular',
          className: 'text-danger',
        });
        return {
          nodes: [formatAction, renderAction, ...gap.nodes, resetAction],
          edges: [
            { source: 'root', target: 'render' },
            { source: 'root', target: 'format' },
            ...gap.edges,
            { source: 'root', target: 'reset' },
          ],
        };
      }),
    ),
  );

export const ThemeEditor = () => {
  const [key, setKey] = useState(0);
  const creator = useMemo(() => toolbarCreator(() => setKey((key) => key + 1)), []);
  const menu = useMenuActions(creator);

  return (
    <StackItem.Content toolbar>
      <MenuProvider {...menu} attendableId={themeEditorId}>
        <ToolbarMenu />
      </MenuProvider>
      <JsonEditor key={`${themeEditorId}/${key}`} />
    </StackItem.Content>
  );
};
