//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';

import { MarkdownBlueprint } from '../blueprints';

export const functions = MarkdownBlueprint.functions;

export default (): (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[] => [
  contributes(Capabilities.Functions, functions),
  contributes(Capabilities.BlueprintDefinition, MarkdownBlueprint.make()),
];
