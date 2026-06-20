//
// Copyright 2025 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { Markdown, MarkdownOperation } from '#types';

const make = () =>
  Skill.make({
    key: Markdown.SKILL_KEY,
    name: 'Markdown',
    description: 'Work with markdown documents. Preferred over raw database operations.',
    tools: Skill.toolDefinitions({
      operations: [MarkdownOperation.Create, MarkdownOperation.Open, MarkdownOperation.Update],
    }),
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

const skill: Skill.Definition = {
  key: Markdown.SKILL_KEY,
  make,
};

export default skill;
