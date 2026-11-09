//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { CodeOperation } from '#types';

import instructions from './spec-review-skill.md?raw';

export const key = 'org.dxos.skill.code.specReview';

export const operations: readonly Operation.Definition.Any[] = [CodeOperation.CreateSpecReview];

/** Records how far the code meets a spec: one review per pass, a verdict per spec item. */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Spec review',
    description:
      'Record a compliance review of a spec: a verdict per feature requirement, type, operation, component and test, ' +
      'saying how far the code meets it. Use after reviewing a spec against its code.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({ operations }),
  });
