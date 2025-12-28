//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';

import { MarkdownBlueprint } from '../blueprints';

export const functions = MarkdownBlueprint.functions;

type BlueprintCapabilities = (
  | Capability.Capability<typeof Capabilities.Functions>
  | Capability.Capability<typeof Capabilities.BlueprintDefinition>
)[];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(
  (): BlueprintCapabilities => [
    Capability.contributes(Capabilities.Functions, functions),
    Capability.contributes(Capabilities.BlueprintDefinition, MarkdownBlueprint.make()),
  ],
);

export default blueprintDefinition;
