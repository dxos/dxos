//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as AssistantBlueprint from './blueprint';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { AiContextService, AiConversationService } from '@dxos/assistant';
import { Database, Query, Ref } from '@dxos/echo';
import { Data } from 'effect/Schema';
import { Organization } from '@dxos/types';
import { dbg } from '@dxos/log';
import { Blueprint } from '@dxos/blueprints';

const TestLayer = AssistantTestLayer({
  functions: [...AssistantBlueprint.functions],
  types: [Organization.Organization, Blueprint.Blueprint],
  tracing: 'pretty',
});

describe('Assistant Blueprint', () => {
  it.effect(
    'create an object',
    Effect.fnUntraced(
      function* (_) {
        yield* addAssistantBlueprint();
        yield* AiConversationService.run({
          prompt: 'Create a new organization called "Cyberdyne Systems".',
        });
        const orgs = yield* Database.runQuery(Query.type(Organization.Organization, { name: 'Cyberdyne Systems' }));
        dbg(orgs);
        expect(orgs).toHaveLength(1);
      },
      Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer))),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});

const addAssistantBlueprint = Effect.fnUntraced(function* () {
  yield* AiContextService.bindContext({
    blueprints: [Ref.make(yield* Database.add(AssistantBlueprint.make()))],
  });
});
