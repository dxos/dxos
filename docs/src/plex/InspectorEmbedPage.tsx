//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../styles/island-base.generated.css';

import React from 'react';

import '@dxos/node-std/globals';
import '@dxos/react-ui/theme.css';
import { Inspector, type PanelId } from '@dxos/plugin-inspector';

import { make } from '../app-framework-tutorial/dx.config.ts';
import { EMPTY, isStage, modulesAt } from './stages.ts';

const PANELS: readonly PanelId[] = ['graph', 'operations', 'plugin', 'surfaces', 'translations', 'types'];

const isPanel = (value: unknown): value is PanelId => PANELS.some((panel) => panel === value);

/**
 * The inspector with Bookmarks as it stands after the page in the query, as `/embed/inspector/` renders it. Query:
 * `?stage=<Stage>&panel=<PanelId>`; the whole plugin when the stage is absent.
 */
export const InspectorEmbedPage = () => {
  const params = new URLSearchParams(window.location.search);
  const stage = params.get('stage');
  const panel = params.get('panel');

  return (
    <Inspector
      plugin={make()}
      modules={isStage(stage) ? modulesAt(stage) : undefined}
      panel={isPanel(panel) ? panel : undefined}
      empty={EMPTY}
    />
  );
};
