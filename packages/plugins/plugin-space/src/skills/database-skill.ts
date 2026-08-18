//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { SpaceObjectOperation, SpaceOperation } from '#types';

export const SKILL_KEY = 'org.dxos.plugin.space.skill.database';

/**
 * Reading and writing the objects of a space, over the same verbs the app and the MCP surface use —
 * the plugin that owns the objects owns the skill that manipulates them. The schema, relation and
 * tag half still lives in assistant-toolkit's `Database schema` skill, and joins this one when it
 * relocates.
 */
const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Database',
    description: 'Query, read, create, update and remove objects in the current space.',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({
      operations: [
        SpaceOperation.AddObject,
        SpaceOperation.AddRelation,
        SpaceOperation.AddType,
        SpaceObjectOperation.GetObjects,
        SpaceObjectOperation.QueryObjects,
        SpaceObjectOperation.QueryTypes,
        SpaceObjectOperation.UpdateObject,
        SpaceOperation.RemoveObjects,
        SpaceObjectOperation.AddTag,
        SpaceObjectOperation.RemoveTag,
      ],
    }),
    instructions: Template.make({
      source: trim`
        You can query, read, create, update and remove objects in the current space.

        # Finding things
        - Query before you write: an object the user refers to usually exists already.
        - Query by typename to narrow, by text to search, or by neither to list everything.
        - Query returns identifiers only unless you pass includeContent; read the ones you need with
          the get tool, passing every reference in one call rather than one at a time.
        - Queue-backed content (mailbox email, calendar events) is invisible to a plain query: pass
          includeQueues, or scope with 'in' to the feed that holds it.

        # Writing
        - Create by describing the object: pass 'create' with its typename under '@type' and the
          remaining fields alongside. Prefer a type's own create tool where one exists — it builds
          the object's owned parts correctly.
        - Add files an object into the space; pass 'target' to file it into a specific collection.
        - Update patches the fields you supply and leaves the rest alone.
        - References are the { "/": "echo:..." } envelope form, in both directions.

        # Types and tags
        - Query the types before writing an object of an unfamiliar type: the summary lists what the
          space knows, and asking for a typename returns the schema its fields must match.
        - Tags are themselves objects, so query for one before creating another.
        - A relation is typed too: name a relation type the space knows and pass its own fields.
        - No type fits? Add one from its JSON Schema, then create objects of it.
      `,
    }),
  });

export const DatabaseSkill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};
