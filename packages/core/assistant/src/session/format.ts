//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Template } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { type ObjectId } from '@dxos/echo/internal';
import { ObjectVersion } from '@dxos/echo-db';
import { DatabaseService } from '@dxos/functions';
import { log } from '@dxos/log';
import { type ContentBlock, Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { AiAssistantError } from '../errors';

import { ArtifactDiffResolver } from './artifact-diff';
import { type AiSessionRunParams } from './session';

/**
 * Formats the system prompt.
 */
// TODO(burdon): Move to AiPreprocessor.
export const formatSystemPrompt = ({
  system,
  blueprints = [],
  objects = [],
}: Pick<AiSessionRunParams<any>, 'system' | 'blueprints' | 'objects'>) =>
  Effect.gen(function* () {
    const blueprintDefs = yield* Function.pipe(
      blueprints,
      Effect.forEach((blueprint) => Effect.succeed(blueprint.instructions)),
      Effect.flatMap(Effect.forEach((template) => DatabaseService.loadOption(template.source))),
      Effect.map(Array.filter(Option.isSome)),
      Effect.map(
        Array.map(
          (template) => trim`
            <blueprint>
              ${Template.process(template.value.content)}
            </blueprint>
          `,
        ),
      ),
      Effect.map((blueprints) =>
        blueprints.length > 0 ? ['## Blueprints Definitions', ...blueprints].join('\n\n') : undefined,
      ),
    );

    const objectDefs = yield* Function.pipe(
      objects,
      Effect.forEach((object) =>
        Effect.succeed(trim`
          <object>
            <dxn>${Obj.getDXN(object)}</dxn>
            <typename>${Obj.getTypename(object)}</typename>
          </object>
        `),
      ),
      Effect.map((objects) => (objects.length > 0 ? ['## Context Objects', ...objects].join('\n\n') : undefined)),
    );

    return yield* Function.pipe(
      Effect.succeed([system, blueprintDefs, objectDefs].filter((def): def is string => def !== undefined)),
      Effect.map((parts) => parts.join('\n\n')),
    );
  });

/**
 * Formats the user prompt.
 */
// TODO(burdon): Move to AiPreprocessor.
// TODO(burdon): Convert util below to `Effect.fn` (to preserve stack info)
export const formatUserPrompt = ({ prompt, history = [] }: Pick<AiSessionRunParams<any>, 'prompt' | 'history'>) =>
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
      blocks: [...blocks, { _tag: 'text', text: prompt }],
    });
  });

const gatherObjectVersions = (messages: Message.Message[]): Map<ObjectId, ObjectVersion> => {
  const artifactIds = new Map<ObjectId, ObjectVersion>();
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
  artifactDiff: Map<ObjectId, { version: ObjectVersion; diff?: string }>,
): ContentBlock.Any => {
  return {
    _tag: 'text',
    // TODO(dmaretskyi): Does this need to be a special content-block?
    disposition: 'artifact-update',
    text: trim`
      The following artifacts have been updated since the last message:
      ${[...artifactDiff.entries()]
        .map(([id, { diff }]) => `<changed-artifact id="${id}">${diff ? `\n${diff}` : ''}</changed-artifact>`)
        .join('\n')}
    `,
  };
};
