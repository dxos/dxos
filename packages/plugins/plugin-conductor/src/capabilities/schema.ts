//
// Copyright 2023 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ComputeGraph } from '@dxos/conductor';
import { CanvasBoard } from '@dxos/react-ui-canvas-editor/types';

export const Schema = AppCapability.schema([CanvasBoard.CanvasBoard, ComputeGraph]);
