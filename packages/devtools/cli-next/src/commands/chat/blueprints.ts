//
// Copyright 2025 DXOS.org
//

import { Blueprint } from '@dxos/blueprints';
import { createBlueprint } from '@dxos/plugin-assistant/blueprints';

const AssistantBlueprint = createBlueprint();
export const blueprintRegistry = new Blueprint.Registry([AssistantBlueprint]);
