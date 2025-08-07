//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit } from '@effect/ai';
import { Array, type Context, Effect, Option, String, pipe } from 'effect';

import { ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { Template } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { ObjectVersion } from '@dxos/echo-db';
import { type ObjectId } from '@dxos/echo-schema';
import { DatabaseService } from '@dxos/functions';
import { log } from '@dxos/log';
import { type ContentBlock, DataType } from '@dxos/schema';
import { isNotFalsy, trim } from '@dxos/util';

import { AiAssistantError } from '../errors';

import { ArtifactDiffResolver } from './artifact-diff';
import { type SessionRunParams } from './session';

/**
 * Build a combined toolkit from the blueprint tools and the provided toolkit.
 */
export const createToolkit = <Tools extends AiTool.Any>({
  blueprints = [],
  toolkit,
}: Pick<SessionRunParams<Tools>, 'blueprints' | 'toolkit'>) =>
  Effect.gen(function* () {
    const blueprintToolkit = yield* ToolResolverService.resolveToolkit(blueprints.flatMap(({ tools }) => tools));
    const blueprintToolkitHandler: Context.Context<AiTool.ToHandler<AiTool.Any>> = yield* blueprintToolkit.toContext(
      ToolExecutionService.handlersFor(blueprintToolkit),
    );

    return yield* AiToolkit.merge(...[toolkit, blueprintToolkit].filter(isNotFalsy)).pipe(
      Effect.provide(blueprintToolkitHandler),
    ) as Effect.Effect<AiToolkit.ToHandler<any>, never, AiTool.ToHandler<Tools>>;
  });

/**
 * Formats the system prompt.
 */
// TODO(burdon): Move to AiPreprocessor.
export const formatSystemPrompt = ({
  system,
  blueprints = [],
  objects = [],
}: Pick<SessionRunParams<any>, 'system' | 'blueprints' | 'objects'>) =>
  Effect.gen(function* () {
    // TOOD(burdon): Should process templates.
    const blueprintDefs = yield* pipe(
      blueprints,
      Effect.forEach((blueprint) => Effect.succeed(blueprint.instructions)),
      Effect.flatMap(Effect.forEach((template) => DatabaseService.load(template.source))),
      Effect.map(
        Array.map(
          (template) => trim`
            <blueprint>
              ${Template.process(template.content)}
            </blueprint>
          `,
        ),
      ),
      // Effect.tap((templates) => log.info('templates', { templates })),
      Effect.map(Array.reduce('\n\n## Blueprints:\n\n', String.concat)),
    );

    const objectDefs = yield* pipe(
      objects,
      Effect.forEach((object) =>
        Effect.succeed(trim`
          <object>
            <dxn>${Obj.getDXN(object)}</dxn>
            <typename>${Obj.getTypename(object)}</typename>
          </object>
        `),
      ),
      Effect.map(Array.reduce('\n## Context objects:\n\n', String.concat)),
    );

    return yield* pipe(
      Effect.succeed([blueprintDefs, objectDefs]),
      Effect.map(Array.reduce(system ?? '', String.concat)),
    );
  });

/**
 * Formats the user prompt.
 */
// TODO(burdon): Move to AiPreprocessor.
// TODO(burdon): Convert util below to `Effect.fn` (to preserve stack info)
export const formatUserPrompt = ({ prompt, history = [] }: Pick<SessionRunParams<any>, 'prompt' | 'history'>) =>
  Effect.gen(function* () {
    const prelude: ContentBlock.Any[] = [];

    // TODO(dmaretskyi): Evaluate other approaches as `serviceOption` isn't represented in the type system.
    const artifactDiffResolver = yield* Effect.serviceOption(ArtifactDiffResolver);
    if (Option.isSome(artifactDiffResolver)) {
      const versions = gatherObjectVersions(history);
      const artifactDiff = yield* Effect.tryPromise({
        try: () =>
          artifactDiffResolver.value.resolve(
            [...versions.entries()].map(([id, version]) => ({ id, lastVersion: version })),
          ),
        catch: AiAssistantError.wrap('Artifact diff resolution error'),
      });

      log.info('version', { artifactDiff, versions });
      for (const [id, { version }] of [...artifactDiff.entries()]) {
        if (ObjectVersion.equals(version, versions.get(id)!)) {
          artifactDiff.delete(id);
          continue;
        }

        prelude.push({ _tag: 'anchor', objectId: id, version });
      }

      if (artifactDiff.size > 0) {
        prelude.push(createArtifactUpdateBlock(artifactDiff));
      }
    }

    return Obj.make(DataType.Message, {
      created: new Date().toISOString(),
      sender: { role: 'user' },
      blocks: [...prelude, { _tag: 'text', text: prompt }],
    });
  });

export const gatherObjectVersions = (messages: DataType.Message[]): Map<ObjectId, ObjectVersion> => {
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

export const createArtifactUpdateBlock = (
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
