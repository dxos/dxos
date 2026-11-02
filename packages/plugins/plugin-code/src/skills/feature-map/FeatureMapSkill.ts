//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
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
  // Features are the goal states work moves; linking and showcasing are how the feature map shows that work.
  CodeOperation.CreateFeature,
  CodeOperation.UpdateFeature,
  CodeOperation.DeleteFeature,
  CodeOperation.CreateSpec,
  CodeOperation.UpdateSpec,
  CodeOperation.AddFeatureDependency,
  CodeOperation.RemoveFeatureDependency,
  CodeOperation.LinkFeatureTask,
  CodeOperation.CreateShowcase,
  CodeOperation.GetFeatures,
  CodeOperation.ImportSpecFeatures,
  CodeOperation.ExportSpecFeatures,
];

/**
 * The feature map skill: a product's features on the specs of the project tracking its work, their dependencies, the
 * tasks that move them and the showcases that prove them. It assumes the project skill for the tasks themselves.
 */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Feature map',
    description:
      "Keep a product's feature map: features on the specs a project owns, their requirements, status and " +
      'dependencies, the tasks that move them and the showcases that prove them. Use with the project skill when ' +
      'work moves a product feature, or when extracting features from a spec.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({ operations }),
  });
