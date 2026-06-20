//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Skill, Operation, Routine } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import { meta } from '../meta';
import { ProviderSkill } from '../skills';
import { Provider, SearchOperation } from '../types';

const TOAST_ID = `${meta.profile.key}/regenerate`;

/**
 * Runs the provider skill agent: materializes the {@link ProviderSkill} as an ECHO
 * Skill object in the space (cloning the static definition on first use, mirroring the
 * `create-chat` operation), then invokes the {@link AgentPrompt} routine with the skill and
 * provider bound as context. The agent fetches the vendor site (analyzeProvider) and persists a
 * derived search schema + request/result mapping (setProviderTemplate). Returns the (mutated)
 * provider.
 */
const handler: Operation.WithHandler<typeof SearchOperation.GenerateProviderTemplate> =
  SearchOperation.GenerateProviderTemplate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ provider: providerRef }) {
        // Surface progress: this runs a render fetch + an LLM agent turn and can take a minute, so
        // without feedback the toolbar action looks inert. Toasts share an id so they update in place.
        yield* Operation.invoke(LayoutOperation.AddToast, {
          id: TOAST_ID,
          icon: 'ph--sparkle--regular',
          title: ['regenerate.toast.pending.title', { ns: meta.profile.key }],
        });

        const program = Effect.gen(function* () {
          const { db } = yield* Database.Service;
          const provider = yield* Database.load(providerRef);

          // Materialize the static skill definition as an ECHO Skill object in the space
          // (cloned once and reused thereafter), keyed by `Provider.SKILL_KEY`.
          const skills = yield* Effect.promise(() => db.query(Filter.type(Skill.Skill)).run());
          const skill =
            skills.find((candidate) => Obj.getMeta(candidate).key === Provider.SKILL_KEY) ??
            db.add(ProviderSkill.make());

          // The AgentPrompt routine loads `skills`/`context` and binds them to its own session,
          // so the skill tools (analyzeProvider, setProviderTemplate) and the provider object are
          // available to the agent without a pre-bound chat.
          const routine = Routine.make({
            name: 'Generate Provider Template',
            instructions: trim`
            Analyze the provider at ${provider.url} and populate its search template by calling the
            available tools: first analyze-provider to fetch the vendor site, then set-provider-template
            to persist the result. Derive the typed search fields (search schema), the request mapping,
            and the result mapping. Only include fields and selectors you can justify from the page source.
          `,
            skills: [Ref.make(skill)],
            context: [Ref.make(provider)],
          });

          // Create the conversation feed in the space so the spawned AgentPrompt environment inherits
          // space affinity (without it, AgentPrompt creates a space-less feed and Database.Service is
          // unavailable in the spawn). Mirrors the assistant e2e harness.
          const conversationFeed = yield* Database.add(Feed.make());

          yield* Database.flush();
          yield* Operation.invoke(
            AgentPrompt,
            { prompt: Ref.make(routine), input: {} },
            { spaceId: db.spaceId, conversation: Obj.getURI(conversationFeed) },
          );

          // Reload so the mutation persisted by setProviderTemplate is reflected.
          const updated = yield* Database.load(providerRef);
          return updated;
        });

        const updated = yield* program.pipe(
          Effect.tapError((error) =>
            Effect.gen(function* () {
              log.catch(error);
              yield* Operation.invoke(LayoutOperation.AddToast, {
                id: TOAST_ID,
                icon: 'ph--warning--regular',
                title: ['regenerate.toast.error.title', { ns: meta.profile.key }],
                description: ['regenerate.toast.error.description', { ns: meta.profile.key }],
              });
            }),
          ),
        );

        const fieldCount = Object.keys(updated.searchSchema?.properties ?? {}).length;
        log.info('generate-provider-template: done', {
          url: updated.url,
          searchFields: fieldCount,
          hasRequest: updated.request != null,
          hasResult: updated.result != null,
        });
        yield* Operation.invoke(LayoutOperation.AddToast, {
          id: TOAST_ID,
          icon: 'ph--check-circle--regular',
          title: ['regenerate.toast.success.title', { ns: meta.profile.key }],
          description: [
            fieldCount > 0 ? 'regenerate.toast.success.description' : 'regenerate.toast.empty.description',
            { ns: meta.profile.key, count: fieldCount },
          ],
        });

        return Ref.make(updated);
      }),
    ),
  );

export default handler;
