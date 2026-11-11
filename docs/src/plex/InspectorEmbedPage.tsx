//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../styles/island-base.generated.css';

import React from 'react';

import { DEV_SERVER_PORT } from '@dxos/app-framework/PluginManifest';
import '@dxos/node-std/globals';
import { Inspector, type KindId } from '@dxos/plugin-inspector';
import '@dxos/react-ui/theme.css';

import { make } from '../app-framework-tutorial/dx.config.ts';

const KIND_IDS: readonly KindId[] = [
  'app-graph',
  'create-object',
  'operations',
  'schema',
  'skill',
  'surface',
  'translations',
];

const isKindId = (value: string): value is KindId => KIND_IDS.some((kind) => kind === value);

/**
 * The inspector as `/embed/inspector/` renders it. With `?dev&adds=<kind>,…` it loads the reader's plugin from its dev
 * server and checks the kinds of module the page adds; without, it shows the finished Bookmarks plugin.
 */
export const InspectorEmbedPage = () => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('dev')) {
    return <Inspector plugin={make()} />;
  }

  return (
    <Inspector
      manifestUrl={`http://localhost:${DEV_SERVER_PORT}/manifest.json`}
      adds={(params.get('adds') ?? '').split(',').filter(isKindId)}
    />
  );
};
