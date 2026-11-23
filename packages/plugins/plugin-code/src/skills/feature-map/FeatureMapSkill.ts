//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import * as ProjectOperation from '@dxos/plugin-projects/ProjectOperation';
import { Text } from '@dxos/schema';

import { CodeOperation } from '#types';

// The workflow content lives beside this module as markdown so it can be edited as prose.
import instructions from './feature-map-skill.md?raw';

export const key = 'org.dxos.skill.code.featureMap';

/**
 * Every verb the skill drives. Imported rather than named as strings: an unresolvable ToolId is dropped from the
 * session toolkit with only a log line.
 */
export const operations: readonly Operation.Definition.Any[] = [
  // Features are blocks of a spec's text; linking and showcasing are how the map shows the work on them.
  CodeOperation.CreateShowcase,
  CodeOperation.CreateSpec,
  CodeOperation.LinkTask,
  CodeOperation.UpdateSpec,
  ProjectOperation.DeleteSpecBlock,
  ProjectOperation.GetSpecBlocks,
  ProjectOperation.SetSpecBlock,
];

/**
 * The feature map skill: the `feat` blocks of the specs of the project tracking a product's work, their needs, the
 * tasks that move them and the showcases that prove them. It assumes the project skill for the tasks themselves.
 */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Feature map',
    description:
      "Keep a product's feature map: the feat blocks of the specs a project owns, their requirements, status and " +
      'needs, the tasks that move them and the showcases that prove them. Use with the project skill when work ' +
      'moves a product feature.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({ operations }),
  });
