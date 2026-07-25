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
        // SuggestEdit is intentionally NOT exposed yet: without the runtime providing an
        // AgentIdentity (deferred), it would die for lack of a creator. Add it back with that wiring.
        MarkdownOperation.MergeBranch,
        MarkdownOperation.CreateCheckpoint,
        MarkdownOperation.GetSelection,
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
        - When asked to edit in a branch (or to propose changes for review), first create a branch
          with the create-branch tool, then apply the edits with the update tool passing the returned
          branchId. Leave the branch unmerged so the changes can be reviewed. Do not merge unless asked.
        - Merge a branch back into the document with the merge-branch tool once its changes are approved.
        - Record a named checkpoint of the current content with the create-checkpoint tool.

        When the user refers to "the selection" or "the selected text", call the get-selection tool
        once (no arguments) to retrieve exactly what they have selected before acting on it; it
        already reports the current selection across open documents, so do not call it per document.
        An empty result means nothing is selected — ask what text they mean rather than guessing.
      `,
    }),
    agentCanEnable: true,
  });

const skill: Skill.Definition = {
  key: Markdown.SKILL_KEY,
  make,
};

export default skill;
