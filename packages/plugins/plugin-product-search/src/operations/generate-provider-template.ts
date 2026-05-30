//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { trim } from '@dxos/util';

import { ProviderBlueprint } from '../blueprints';
import { Provider, SearchOperation } from '../types';

/**
 * Runs the provider blueprint agent: materializes the {@link ProviderBlueprint} as an ECHO
 * Blueprint object in the space (cloning the static definition on first use, mirroring the
 * `create-chat` operation), then invokes the {@link AgentPrompt} routine with the blueprint and
 * provider bound as context. The agent fetches the vendor site (analyzeProvider) and persists a
 * derived search schema + request/result mapping (setProviderTemplate). Returns the (mutated)
 * provider.
 */
const handler: Operation.WithHandler<typeof SearchOperation.GenerateProviderTemplate> =
  SearchOperation.GenerateProviderTemplate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ provider: providerRef }) {
        const { db } = yield* Database.Service;
        const provider = yield* Database.load(providerRef);

        // Materialize the static blueprint definition as an ECHO Blueprint object in the space
        // (cloned once and reused thereafter), keyed by `Provider.BLUEPRINT_KEY`.
        const blueprints = yield* Effect.promise(() => db.query(Filter.type(Blueprint.Blueprint)).run());
        let blueprint = blueprints.find((candidate) => Obj.getMeta(candidate).key === Provider.BLUEPRINT_KEY);
        if (!blueprint) {
          blueprint = db.add(ProviderBlueprint.make());
        }
        invariant(blueprint, 'Provider blueprint not found.');

        // The AgentPrompt routine loads `blueprints`/`context` and binds them to its own session,
        // so the blueprint tools (analyzeProvider, setProviderTemplate) and the provider object are
        // available to the agent without a pre-bound chat.
        const routine = Routine.make({
          name: 'Generate Provider Template',
          instructions: trim`
            Analyze the provider at ${provider.url} and populate its search template by calling the
            available tools: first analyzeProvider to fetch the vendor site, then setProviderTemplate
            to persist the result. Derive the typed search fields (search schema), the request mapping,
            and the result mapping. Only include fields and selectors you can justify from the page source.
          `,
          blueprints: [Ref.make(blueprint)],
          context: [Ref.make(provider)],
        });

        yield* Database.flush();
        yield* Operation.invoke(AgentPrompt, { prompt: Ref.make(routine), input: {} }, { spaceId: db.spaceId });

        // Reload so the mutation persisted by setProviderTemplate is reflected.
        const updated = yield* Database.load(providerRef);
        return Ref.make(updated);
      }),
    ),
  );

export default handler;
