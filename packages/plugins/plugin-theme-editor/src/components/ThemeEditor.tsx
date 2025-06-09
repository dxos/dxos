//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useMemo, useState } from 'react';

import {
  createGapSeparator,
  createMenuAction,
  MenuProvider,
  ToolbarMenu,
  useMenuActions,
  rxFromSignal,
} from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';

import { JsonEditor } from './JsonEditor';
import { themeEditorId } from '../defs';
import { THEME_EDITOR_PLUGIN } from '../meta';
import { saveAndRender, reset } from '../util';

const toolbarCreator = (handleFormat: () => void) =>
  Rx.make((get) =>
    get(
      rxFromSignal(() => {
        const renderAction = createMenuAction('render', () => saveAndRender(), {
          label: ['render label', { ns: THEME_EDITOR_PLUGIN }],
          icon: 'ph--play--regular',
        });
        const formatAction = createMenuAction('format', handleFormat, {
          label: ['format label', { ns: THEME_EDITOR_PLUGIN }],
          icon: 'ph--magic-wand--regular',
        });
        const gap = createGapSeparator();
        const resetAction = createMenuAction('reset', () => reset(), {
          label: ['reset label', { ns: THEME_EDITOR_PLUGIN }],
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
