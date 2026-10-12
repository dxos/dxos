//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as Harness from '@dxos/assistant/Harness';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, DXN, Ref } from '@dxos/echo';

/**
 * The skill's end-request hook: asks a small model whether the agent struggled in the turn that just
 * ended because of its prompting or tooling, and if so reports the trajectory. Defined beside the
 * skill rather than in `#types` because the harness service it needs carries the session runtime,
 * which the UI must not load.
 */
export const AnalyzeTurn = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistant.analyzeTurn'),
    name: 'Analyze Agent Turn',
    icon: 'ph--magnifying-glass--regular',
  },
  services: [Harness.HarnessService, Database.Service, AiService.AiService, Capability.Service],
  input: Schema.Struct({}),
  output: Schema.Void,
});

export const key = 'org.dxos.skill.assistant.turnReview';

/**
 * Bound to a chat by the chat processor while the user has opted into struggle reports. It adds no
 * tools or instructions; it exists only for its hook, which runs in the background so the user never
 * waits on the review.
 */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Turn Review',
    description: 'Reports agent turns that struggled because of their instructions or tools (opt-in telemetry).',
    hooks: [{ spec: { _tag: 'end-request' }, async: true, function: Ref.make(Operation.serialize(AnalyzeTurn)) }],
  });
