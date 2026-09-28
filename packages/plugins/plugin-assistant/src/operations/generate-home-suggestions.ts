//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { AiService } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import * as Operation from '@dxos/compute/Operation';
import { Collection, Database, Filter, Obj, Order, Query, Type } from '@dxos/echo';
import { log } from '@dxos/log';

import { AssistantCapabilities, AssistantOperation } from '#types';

const MODEL = 'com.anthropic.model.claude-haiku-4-5.default';
const RECENT_LIMIT = 20;
const MAX_PROMPTS = 3;

/**
 * Fewer recent objects than this get the fallback prompts: a near-empty space gives the model too
 * little to personalize from, and it is the state every new identity (and every e2e run) starts in.
 */
const MIN_RECENT_OBJECTS = 5;

/** Prompts generated from an unchanged set of recent objects are reused for this long. */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Prompts are reused this long even after the set changes, so an active session regenerates at most hourly. */
const MIN_REFRESH_MS = 60 * 60 * 1000;

// Onboarding documents added by the system at identity creation — exclude them so a
// brand-new default space (containing only the welcome doc) still uses fallback prompts.
const ONBOARDING_DOCUMENT_LABELS = new Set(['Welcome to Composer']);

const handler: Operation.WithHandler<typeof AssistantOperation.GenerateHomeSuggestions> =
  AssistantOperation.GenerateHomeSuggestions.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* () {
        const { db } = yield* Database.Service;
        const spaceId = db.spaceId;

        // Build the recent-objects filter (mirrors SpaceHomeRecent).
        const schemas = yield* Capability.getAll(AppCapabilities.Schema);
        const collectionTypename = Type.getTypename(Collection.Collection);
        const types = schemas
          .flat()
          .filter(Type.isType)
          .filter((type) => TypeOptions.isUserType(type))
          .filter((type) => Type.getTypename(type) !== collectionTypename);
        if (types.length === 0) {
          return { prompts: [] };
        }

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
        if (items.length < MIN_RECENT_OBJECTS) {
          return { prompts: [] };
        }

        // Keyed on the set rather than the order: editing an object reorders the recent list without
        // changing what the prompts are about.
        const fingerprint = items
          .map(({ label, typename }) => `${typename}:${label}`)
          .sort()
          .join('\n');
        const cache = yield* Capabilities.getAtomValue(AssistantCapabilities.HomeSuggestionsCache);
        const entry = cache[spaceId];
        const age = entry ? Date.now() - entry.generatedAt : Infinity;
        if (entry && (age < MIN_REFRESH_MS || (entry.fingerprint === fingerprint && age < CACHE_TTL_MS))) {
          return { prompts: [...entry.prompts] };
        }

        const prompts = yield* generateSuggestions(items);
        const validPrompts = prompts.map((prompt) => prompt.trim()).filter((prompt) => prompt.length > 0);

        if (validPrompts.length > 0) {
          yield* Capabilities.updateAtomValue(AssistantCapabilities.HomeSuggestionsCache, (current) => ({
            ...current,
            [spaceId]: { generatedAt: Date.now(), prompts: validPrompts, fingerprint },
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
    Effect.catch((err) => {
      log.warn('generate-home-suggestions: LLM call failed', { err });
      return Effect.succeed<string[]>([]);
    }),
    Effect.provide(AiService.languageModel(MODEL)),
  );

export default handler;
