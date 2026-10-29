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

import type * as PluginActivation from './PluginActivation.ts';

/** A plugin a release activates. */
export type PluginRecord = {
  readonly key: string;
  readonly name?: string;
};

/** A skill as data: the instructions are resolved because their `Text` lives in no database. */
export type SkillRecord = {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly instructions?: string;
  readonly mcpPrompt: boolean;
  readonly tools: readonly string[];
  readonly hooks: readonly SkillHookRecord[];
};

/** A skill hook, by the key of the operation it runs. */
export type SkillHookRecord = {
  readonly phase: string;
  readonly operation: string;
  readonly input?: Record<string, unknown>;
};

/** An ECHO type a release contributes. */
export type TypeRecord = {
  readonly typename: string;
  readonly version: string;
  readonly jsonSchema: JsonSchema.JsonSchema;
};

/** A plugin module that failed to load or activate; a release with any is not fit to publish. */
export type FailureRecord = {
  readonly id: string;
  readonly phase: string;
  readonly reason: string;
  readonly message: string;
};

/**
 * What a release contributes, as JSON: read by the registry, the router and MCP without starting an isolate.
 *
 * Operations are `PersistentOperation` records in `Obj.toJSON` form, the shape operation-service publishes, so a
 * consumer hydrates them with `Obj.fromJSON`.
 */
export type Catalog = {
  /** The plugin the release publishes; everything else in the catalog is its own. */
  readonly plugin: PluginRecord;
  /** Plugins of its `dependsOn` closure, bundled to activate it. */
  readonly dependencies: readonly PluginRecord[];
  readonly operations: readonly Obj.JSON[];
  readonly skills: readonly SkillRecord[];
  readonly types: readonly TypeRecord[];
  readonly failures: readonly FailureRecord[];
};

/**
 * Builds the catalog of an activation.
 *
 * Must run inside a request: serializing an operation and making a skill mint ids with `crypto.getRandomValues()`.
 */
export const make = (activation: PluginActivation.Activation): Catalog => ({
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

const toPluginRecord = (plugin: Plugin.Plugin): PluginRecord => ({
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

const toSkillRecord = (key: string, skill: Skill.Skill): SkillRecord => ({
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
