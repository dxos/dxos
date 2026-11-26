//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Plugin from '@dxos/app-framework/Plugin';
import type * as Hook from '@dxos/compute/Hook';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Obj, Type } from '@dxos/echo';
import * as JsonSchema from '@dxos/echo/JsonSchema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { PluginProtocol } from '@dxos/protocols';

import type * as PluginActivation from './PluginActivation.ts';

/**
 * Builds the catalog of an activation.
 *
 * Must run inside a request: serializing an operation and making a skill mint ids with `crypto.getRandomValues()`.
 */
export const make = (activation: PluginActivation.Activation): PluginProtocol.Catalog => {
  const operations = serializeOperations(activation.operationHandlers);
  return {
    plugin: toPluginRecord(activation.primary),
    operations: operations.map((record) => Obj.toJSON(record)),
    skills: activation.skills.map((definition) => toSkillRecord(String(definition.key), definition.make())),
    hooks: servedHooks(
      activation.hooks,
      new Set(operations.flatMap((record) => Operation.getKey(record) ?? []).map(operationName)),
    ),
    types: activation.types.map((type) => ({
      typename: Type.getTypename(type),
      version: Type.getVersion(type),
      jsonSchema: JsonSchema.toJsonSchema(type),
    })),
    failures: activation.failures.map(({ id, phase, reason, error }) => ({
      id,
      phase,
      reason,
      message: error.message,
    })),
    protocolVersion: PluginProtocol.PROTOCOL_VERSION,
  };
};

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

/**
 * The hooks whose operation the catalog lists: EDGE runs a hook by invoking its operation, and a bundle serves only its
 * own, so a hook on any other operation could not run here.
 */
const servedHooks = (hooks: readonly Hook.Definition[], served: ReadonlySet<string>): PluginProtocol.HookRecord[] =>
  hooks.flatMap((hook) => {
    // Named as operation-service names a hook's operation, so EDGE reads both catalogs' hooks alike.
    const operation = String(hook.operation.meta.key);
    if (!served.has(operationName(operation))) {
      log.warn('hook operation is not in the catalog; hook excluded', { key: hook.key, operation });
      return [];
    }
    return [
      {
        key: hook.key,
        plugin: hook.plugin,
        event: hook.event,
        ...(hook.skill !== undefined ? { skill: hook.skill } : {}),
        operation,
        ...(hook.input !== undefined ? { input: { ...hook.input } } : {}),
        ...(hook.async ? { async: true } : {}),
      },
    ];
  });

/** An operation key as a bare name, whether given as one or as a DXN. */
const operationName = (key: string): string => (DXN.isDXN(key) ? DXN.getName(key) : key);

const toSkillRecord = (key: string, skill: Skill.Skill): PluginProtocol.SkillRecord => ({
  key,
  ...(Obj.getMeta(skill).version !== undefined ? { version: Obj.getMeta(skill).version } : {}),
  name: skill.name,
  description: skill.description,
  instructions: skill.instructions?.source?.target?.content,
  mcpPrompt: Skill.isMcpPrompt(skill),
  // A plain array, so branded tool ids survive structured clone.
  tools: Array.from(skill.tools ?? []).map(String),
  ...(skill.agentCanEnable ? { agentCanEnable: true } : {}),
});
