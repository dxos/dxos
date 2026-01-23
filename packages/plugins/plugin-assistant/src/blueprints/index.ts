//
// Copyright 2025 DXOS.org
//

import { type Blueprint } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';

import * as AssistantBlueprint from './assistant-blueprint';

export { AssistantBlueprint };
export const blueprints: Blueprint.Blueprint[] = AssistantBlueprint.blueprints;
export const functions: FunctionDefinition[] = AssistantBlueprint.functions;
