//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { type FunctionNotFoundError } from '@dxos/compute';
import type * as Operation from '@dxos/compute/Operation';
import * as Template from '@dxos/compute/Template';
import { Database, Obj, type Registry } from '@dxos/echo';
import { ObjectVersion } from '@dxos/echo-client';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type ContentBlock, Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { AiAssistantError } from '../util';
import type * as AiRequest from './AiRequest';
import { ArtifactDiffResolver } from './artifact-diff';

/**
 * Formats the system prompt.
 */
// TODO(burdon): Move to AiPreprocessor.
export const formatSystemPrompt = ({
  system,
  skills = [],
  objects = [],
  instructions = [],
}: Pick<AiRequest.RunProps, 'system' | 'skills' | 'objects' | 'instructions'>): Effect.Effect<
  string,
  FunctionNotFoundError | EntityNotFoundError,
  Database.Service | Registry.Service | Operation.Service
> =>
  Effect.gen(function* () {
    const skillDefs = yield* Function.pipe(
      skills,
      Effect.forEach((skill) => Effect.succeed(skill.instructions)),
      Effect.flatMap(
        Effect.forEach((template) =>
          Effect.gen(function* () {
            return trim`
            <skill>
              ${yield* Template.processTemplate(template)}
            </skill>
          `;
          }),
        ),
      ),
      Effect.map((skills) => (skills.length > 0 ? ['## Skills Definitions', ...skills].join('\n\n') : undefined)),
    );

    // Instructions steer the session, so their text (and sentinel commands) belongs in the system
    // prompt itself — a context-object stub would force the model to tool-load them and follow nothing.
    const instructionDefs = yield* Function.pipe(
      instructions,
      Effect.forEach((instructions) =>
        Effect.gen(function* () {
          // A broken text ref degrades to commands-only rather than failing the whole prompt.
          const text = yield* Database.load(instructions.text).pipe(
            Effect.map((doc) => doc.content.trim()),
            Effect.catchTag('EntityNotFoundError', () => Effect.succeed('')),
          );
          const commands = (instructions.commands ?? []).map(
            ({ sentinel, description, prompt }) =>
              `- \`${sentinel}\`${description ? ` (${description})` : ''}: ${prompt}`,
          );
          const parts = [text];
          if (commands.length > 0) {
            parts.push(
              ['When the user message contains one of these sentinel commands, follow its prompt:', ...commands].join(
                '\n',
              ),
            );
          }
          return `<instructions>\n${parts.filter(Boolean).join('\n\n')}\n</instructions>`;
        }),
      ),
      Effect.map((defs) => (defs.length > 0 ? ['## Instructions', ...defs].join('\n\n') : undefined)),
    );

    const objectDefs = yield* Function.pipe(
      objects,
      Effect.forEach((object) => {
        // Carry the label so the model only tool-loads an object when it needs the contents,
        // not just to learn what the reference is.
        const label = Obj.getLabel(object);
        return Effect.succeed(
          trim`
            <object>
              <dxn>${Obj.getURI(object)}</dxn>
              <typename>${Obj.getTypename(object)}</typename>${label ? `\n  <label>${label}</label>` : ''}
            </object>
          `,
        );
      }),
      Effect.map((objects) => (objects.length > 0 ? ['## Context Objects', ...objects].join('\n\n') : undefined)),
    );

    return yield* Function.pipe(
      Effect.succeed(
        [system, instructionDefs, skillDefs, objectDefs].filter((def): def is string => def !== undefined),
      ),
      Effect.map((parts) => parts.join('\n\n')),
    );
  }).pipe(Effect.withSpan('formatSystemPrompt'));

/**
 * Formats the user prompt.
 */
// TODO(burdon): Move to AiPreprocessor.
// TODO(burdon): Convert util below to `Effect.fn` (to preserve stack info)
export const formatUserPrompt = ({
  prompt,
  history = [],
}: Pick<AiRequest.RunProps, 'prompt' | 'history'>): Effect.Effect<Message.Message, AiRequest.RunError> =>
  Effect.gen(function* () {
    const blocks: ContentBlock.Any[] = [];

    // TODO(dmaretskyi): Evaluate other approaches as `serviceOption` isn't represented in the type system.
    const artifactDiffResolver = yield* Effect.serviceOption(ArtifactDiffResolver);
    if (Option.isSome(artifactDiffResolver)) {
      const versions = gatherObjectVersions(history);
      const artifactDiff = yield* Effect.tryPromise({
        try: () =>
          artifactDiffResolver.value.resolve(
            [...versions.entries()].map(([id, version]) => ({ id, lastVersion: version })),
          ),
        catch: AiAssistantError.wrap({ message: 'Artifact diff resolution error' }),
      });

      log('version', { artifactDiff, versions });
      for (const [id, { version }] of [...artifactDiff.entries()]) {
        if (ObjectVersion.equals(version, versions.get(id)!)) {
          artifactDiff.delete(id);
          continue;
        }

        blocks.push({ _tag: 'anchor', objectId: id, version });
      }

      if (artifactDiff.size > 0) {
        blocks.push(createArtifactUpdateBlock(artifactDiff));
      }
    }

    return Obj.make(Message.Message, {
      created: new Date().toISOString(),
      sender: { role: 'user' },
      blocks: typeof prompt === 'string' ? [...blocks, { _tag: 'text', text: prompt }] : [...blocks, ...prompt],
    });
  }).pipe(Effect.withSpan('formatUserPrompt'));

const gatherObjectVersions = (messages: Message.Message[]): Map<EntityId, ObjectVersion> => {
  const artifactIds = new Map<EntityId, ObjectVersion>();
  for (const message of messages) {
    for (const block of message.blocks) {
      if (block._tag === 'anchor') {
        artifactIds.set(block.objectId, block.version as ObjectVersion);
      }
    }
  }

  return artifactIds;
};

const createArtifactUpdateBlock = (
  artifactDiff: Map<EntityId, { version: ObjectVersion; diff?: string }>,
): ContentBlock.Any => {
  return {
    _tag: 'text',
    // TODO(dmaretskyi): Does this need to be a special content-block?
    disposition: 'synthetic',
    text: trim`
      The following artifacts have been updated since the last message:
      ${[...artifactDiff.entries()]
        .map(([id, { diff }]) => `<changed-artifact id="${id}">${diff ? `\n${diff}` : ''}</changed-artifact>`)
        .join('\n')}
    `,
  };
};
