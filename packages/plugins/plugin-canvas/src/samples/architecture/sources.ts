//
// Copyright 2026 DXOS.org
//

import composerCompute from '../../../docs/diagrams/composer-compute.dx?raw';
import composerData from '../../../docs/diagrams/composer-data.dx?raw';
import composerEcho from '../../../docs/diagrams/composer-echo.dx?raw';
import composerFramework from '../../../docs/diagrams/composer-framework.dx?raw';
import composerPlugin from '../../../docs/diagrams/composer-plugin.dx?raw';
import composer from '../../../docs/diagrams/composer.dx?raw';
import edgeCompute from '../../../docs/diagrams/edge-compute.dx?raw';
import edgeDb from '../../../docs/diagrams/edge-db.dx?raw';
import edgeHub from '../../../docs/diagrams/edge-hub.dx?raw';
import edgeRouter from '../../../docs/diagrams/edge-router.dx?raw';
import edgeSubduction from '../../../docs/diagrams/edge-subduction.dx?raw';
import edge from '../../../docs/diagrams/edge.dx?raw';

/** Each architecture diagram's semantic-DSL source, by diagram id (the `.dx` file's basename). */
export const DIAGRAM_SOURCES: Readonly<Record<string, string>> = {
  'composer': composer,
  'composer-compute': composerCompute,
  'composer-data': composerData,
  'composer-echo': composerEcho,
  'composer-framework': composerFramework,
  'composer-plugin': composerPlugin,
  'edge': edge,
  'edge-compute': edgeCompute,
  'edge-db': edgeDb,
  'edge-hub': edgeHub,
  'edge-router': edgeRouter,
  'edge-subduction': edgeSubduction,
};
