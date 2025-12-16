//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { create, open, update } from './functions';

export const functions: FunctionDefinition[] = [create, open, update];

export const Key = 'dxos.org/blueprint/markdown';

export const make = () =>
  Blueprint.make({
    key: Key,
    name: 'Markdown',
    tools: Blueprint.toolDefinitions({ functions }),
    instructions: Template.make({
      // TODO(wittjosiah): Move example to function input schema annotation.
      source: trim`
        {{! Markdown }}

        You can create, read and update markdown documents.
        When asked to edit or update documents return updates as a set of compact diff string pairs.
        For each diff, respond with the smallest possible matching span.

        Example:
        ${'```'}diff
        - "There is a tyop in this sentence."
        + "There is a typo in this sentence."
        - "This id good."
        + "This sentence is really good."
        ${'```'}
      `,
    }),
  });
