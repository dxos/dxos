//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';

import { MarkdownBlueprint } from '../../blueprints';

export const functions = MarkdownBlueprint.functions;

type BlueprintCapabilities = (
  | Capability.Capability<typeof Common.Capability.Functions>
  | Capability.Capability<typeof Common.Capability.BlueprintDefinition>
)[];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(
  (): BlueprintCapabilities => [
    Capability.contributes(Common.Capability.Functions, functions),
    Capability.contributes(Common.Capability.BlueprintDefinition, MarkdownBlueprint.make()),
  ],
);

export default blueprintDefinition;
