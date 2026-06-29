//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Collection, Filter, Obj, Order, Query, Type } from '@dxos/echo';
import { HiddenAnnotation, getTypeAnnotation } from '@dxos/echo/Annotation';
import { Kind as EntityKind } from '@dxos/echo/Entity';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import { AssistantCapabilities, AssistantOperation } from '#types';

const MODEL = DXN.make('com.anthropic.model.claudeHaiku45');
const CACHE_TTL_MS = 60 * 60 * 1000;
const RECENT_LIMIT = 20;
const MAX_PROMPTS = 3;

// Onboarding documents added by the system at identity creation — exclude them so a
// brand-new personal space (containing only the welcome doc) still uses fallback prompts.
const ONBOARDING_DOCUMENT_LABELS = new Set(['Welcome to Composer']);

const handler: Operation.WithHandler<typeof AssistantOperation.GenerateHomeSuggestions> =
  AssistantOperation.GenerateHomeSuggestions.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ db }) {
        const spaceId = db.spaceId;

        // Cache check: return early if a fresh result exists.
        const cache = yield* Capabilities.getAtomValue(AssistantCapabilities.HomeSuggestionsCache);
        const entry = cache[spaceId];
        if (entry && Date.now() - entry.generatedAt < CACHE_TTL_MS) {
          return { prompts: [...entry.prompts] };
        }

        // Build the recent-objects filter (mirrors SpaceHomeRecent).
        const schemas = yield* Capability.getAll(AppCapabilities.Schema);
        const collectionTypename = Type.getTypename(Collection.Collection);
        const types = schemas
          .flat()
          .filter(Type.isType)
          .filter((type) => getTypeAnnotation(Type.getSchema(type))?.kind !== EntityKind.Relation)
          .filter((type) => !HiddenAnnotation.get(Type.getSchema(type)).pipe(Option.getOrElse(() => false)))
          .filter((type) => Type.getTypename(type) !== collectionTypename);

        let prompts: string[] = [];

        if (types.length > 0) {
          const objects = yield* Effect.promise(() =>
            db
              .query(
                Query.select(Filter.or(...types.map((type) => Filter.type(type))))
                  .orderBy(Order.updated('desc'))
                  .limit(RECENT_LIMIT),
              )
              .run(),
          );

          const items = objects
            .filter(Obj.isObject)
            .filter((obj) => !Obj.isDeleted(obj))
            .filter((obj) => !ONBOARDING_DOCUMENT_LABELS.has(Obj.getLabel(obj) ?? ''))
            .flatMap((obj): { label: string; typename: string }[] => {
              const label = Obj.getLabel(obj);
              const typename = Obj.getTypename(obj);
              return label && typename ? [{ label, typename }] : [];
            });

          if (items.length > 0) {
            prompts = yield* generateSuggestions(items);
          }
        }

        const validPrompts = prompts.map((p) => p.trim()).filter((p) => p.length > 0);

        if (validPrompts.length > 0) {
          yield* Capabilities.updateAtomValue(AssistantCapabilities.HomeSuggestionsCache, (current) => ({
            ...current,
            [spaceId]: { generatedAt: Date.now(), prompts: validPrompts },
          }));
        }

        return { prompts: validPrompts };
      }),
    ),
  );

const generateSuggestions = (items: { label: string; typename: string }[]) =>
  Effect.scoped(
    LanguageModel.generateObject({
      schema: Schema.Struct({ prompts: Schema.Array(Schema.String) }),
      prompt: [
        'Generate exactly 3 short, imperative, specific starter prompts for an AI assistant with access to this workspace.',
        'Each prompt must be one sentence, at most 10 words, with no markdown or numbering.',
        '',
        'Recent workspace objects:',
        ...items.map(({ label, typename }) => `- ${label} (${typename})`),
      ].join('\n'),
    }),
  ).pipe(
    Effect.map(({ value }) => [...value.prompts.slice(0, MAX_PROMPTS)]),
    Effect.catchAll((err) => {
      log.warn('generate-home-suggestions: LLM call failed', { err });
      return Effect.succeed<string[]>([]);
    }),
    Effect.provide(AiService.model(MODEL)),
  );

export default handler;
