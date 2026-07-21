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
      operations: [
        MarkdownOperation.Create,
        MarkdownOperation.Open,
        MarkdownOperation.Update,
        MarkdownOperation.CreateBranch,
        MarkdownOperation.SuggestEdit,
        MarkdownOperation.MergeBranch,
        MarkdownOperation.CreateCheckpoint,
      ],
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

        You can also work on a document without touching the live copy by branching it:
        - To propose changes for review (the usual case), use the suggest-edit tool to open your own
          suggestion branch, then apply edits with the update tool passing the returned branchId. The
          suggestion is attributed to you automatically — do NOT pass a creator. Leave it unmerged for
          review; each of your suggestions accrues on this one branch.
        - When asked to work in a named draft branch instead, create one with the create-branch tool,
          then apply edits with the update tool passing the returned branchId. Leave it unmerged. Do
          not merge unless asked.
        - Merge a branch back into the document with the merge-branch tool once its changes are approved.
        - Record a named checkpoint of the current content with the create-checkpoint tool.
      `,
    }),
    agentCanEnable: true,
  });

const skill: Skill.Definition = {
  key: Markdown.SKILL_KEY,
  make,
};

export default skill;
