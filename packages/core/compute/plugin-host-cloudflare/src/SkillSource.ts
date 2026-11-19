//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ToolId } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { type Entity, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import type { PluginProtocol } from '@dxos/protocols';

/** The keys of what the bundle registers itself, which win over EDGE's records of the same key. */
export type Own = {
  readonly skills: ReadonlySet<string>;
  readonly operations: ReadonlySet<string>;
};

/**
 * A skill as EDGE's registry describes it: its tools resolve against the operation records {@link fromRegistry}
 * returns beside it. Template inputs and MCP servers do not cross the wire.
 */
export const fromRecord = (record: PluginProtocol.SkillRecord): Skill.Skill =>
  Skill.make({
    key: record.key,
    name: record.name,
    ...(record.description !== undefined ? { description: record.description } : {}),
    tools: record.tools.map((tool) => ToolId.make(tool)),
    instructions: Template.make({ source: record.instructions ?? '' }),
    mcpPrompt: record.mcpPrompt,
    // `enableSkills` refuses a skill without it, so dropping it would leave an agent unable to turn the skill on.
    ...(record.agentCanEnable ? { agentCanEnable: true } : {}),
  });

/**
 * The skills and operation records EDGE publishes for its enabled plugins, other than those the bundle registers
 * itself, as entities for the invocation's registry: a skill bound by registry URI, and `querySkills`, resolve through
 * the registry, so without them a bundle sees only its own plugin's skills. A registry that cannot be read costs the
 * invocation those skills rather than failing it.
 */
export const fromRegistry = async (
  registry: PluginProtocol.SkillRegistry | undefined,
  own: Own,
): Promise<Entity.Unknown[]> => {
  if (registry === undefined) {
    return [];
  }
  let catalog: PluginProtocol.SkillCatalog;
  try {
    catalog = await registry.listSkills();
  } catch (error) {
    log.warn('skill registry unavailable; the invocation sees only its own plugin skills', { error });
    return [];
  }
  const records: Entity.Unknown[] = [];
  for (const json of catalog.operations) {
    // A record off the wire is untrusted: one that is not an operation is skipped rather than asserted.
    const record = await Obj.fromJSON(json).catch(() => undefined);
    if (record === undefined || !Obj.instanceOf(Operation.PersistentOperation, record)) {
      continue;
    }
    const key = Operation.getKey(record);
    if (key !== undefined && !own.operations.has(bareKey(key))) {
      records.push(record);
    }
  }
  return [...catalog.skills.filter((skill) => !own.skills.has(bareKey(skill.key))).map(fromRecord), ...records];
};

/** Keys compare without the `dxn:` prefix, which records and definitions spell differently. */
export const bareKey = (key: string): string => key.replace(/^dxn:/, '');
