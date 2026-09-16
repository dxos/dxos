//
// Copyright 2023 DXOS.org
//

import { ComputeGraph } from '@dxos/conductor';
import { CanvasBoard } from '@dxos/react-ui-canvas-editor/types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [CanvasBoard.CanvasBoard, ComputeGraph];
