//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Obj, Type } from '@dxos/echo';
import * as JsonSchema from '@dxos/echo/JsonSchema';
import { log } from '@dxos/log';
import { type PluginProtocol } from '@dxos/protocols';

import type * as PluginActivation from './PluginActivation.ts';

/**
 * Builds the catalog of an activation.
 *
 * Must run inside a request: serializing an operation and making a skill mint ids with `crypto.getRandomValues()`.
 */
export const make = (activation: PluginActivation.Activation): PluginProtocol.Catalog => ({
  plugin: toPluginRecord(activation.primary),
  dependencies: activation.plugins.filter((plugin) => plugin !== activation.primary).map(toPluginRecord),
  operations: serializeOperations(activation.operationHandlers).map((record) => Obj.toJSON(record)),
  skills: activation.skills.map((definition) => toSkillRecord(String(definition.key), definition.make())),
  types: activation.types.map((type) => ({
    typename: Type.getTypename(type),
    version: Type.getVersion(type),
    jsonSchema: JsonSchema.toJsonSchema(type),
  })),
  failures: activation.failures.map(({ id, phase, reason, error }) => ({ id, phase, reason, message: error.message })),
});

const toPluginRecord = (plugin: Plugin.Plugin): PluginProtocol.PluginRecord => ({
  key: plugin.meta.profile.key,
  name: plugin.meta.profile.name,
});

/**
 * Serializes each handler, dropping any whose schema cannot render as JSON Schema: one such operation would
 * otherwise take every other operation of the release out of the catalog.
 */
const serializeOperations = (
  handlers: readonly Operation.WithHandler<Operation.Definition.Any>[],
): Operation.PersistentOperation[] =>
  handlers.flatMap((handler) => {
    try {
      return [Operation.serialize(handler)];
    } catch (error) {
      log.warn('operation is not serializable; excluded from the catalog', {
        key: String(handler.meta.key),
        error: String(error),
      });
      return [];
    }
  });

const toSkillRecord = (key: string, skill: Skill.Skill): PluginProtocol.SkillRecord => ({
  key,
  name: skill.name,
  description: skill.description,
  instructions: skill.instructions?.source?.target?.content,
  mcpPrompt: Skill.isMcpPrompt(skill),
  // A plain array, so branded tool ids survive structured clone.
  tools: Array.from(skill.tools ?? []).map(String),
  hooks: (skill.hooks ?? []).flatMap((hook) => {
    const operation = hook.function?.target;
    const operationKey =
      operation && Obj.instanceOf(Operation.PersistentOperation, operation) ? Operation.getKey(operation) : undefined;
    return operationKey == null
      ? []
      : [
          {
            phase: hook.spec._tag,
            operation: String(operationKey),
            ...(hook.input ? { input: { ...hook.input } } : {}),
          },
        ];
  }),
});
