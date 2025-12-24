//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes, defineCapabilityModule } from '@dxos/app-framework';

import { MarkdownBlueprint } from '../blueprints';

export const functions = MarkdownBlueprint.functions;

type BlueprintCapabilities = (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[];

const blueprintDefinition = defineCapabilityModule<[], BlueprintCapabilities>(
  (): BlueprintCapabilities => [
    contributes(Capabilities.Functions, functions),
    contributes(Capabilities.BlueprintDefinition, MarkdownBlueprint.make()),
  ],
);

export default blueprintDefinition;
