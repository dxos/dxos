//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { spaceGraphSpec } from '../components/index.ts';
import * as CanvasCapabilities from '../types/CanvasCapabilities.ts';

/**
 * The plugin's own extension tools: kinds beyond the canvas's built-in shapes, contributed through the same
 * capability another plugin uses, so the canvas learns of them exactly as it learns of anyone's.
 */
const EXTENSION_KINDS: readonly CanvasCapabilities.NodeTypeContribution[] = [
  { type: 'space-graph', spec: spaceGraphSpec },
];

export default Capability.makeModule(() =>
  Effect.succeed(EXTENSION_KINDS.map((kind) => Capability.contribute(CanvasCapabilities.NodeType, kind))),
);
