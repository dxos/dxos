//
// Copyright 2026 DXOS.org
//

import { Text as EchoText, Obj } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';
import { random } from '@dxos/random';
import { type Text } from '@dxos/schema';
import { Branch } from '@dxos/versioning';

// Deterministic filler so seeded suggestions/comments are stable across runs.
random.seed(1);

export const STORY_AGENT_NAME = 'Kai';

export const SAMPLE_CONTENT = [
  '# Sample',
  '',
  'This document has comment threads attached to it.',
  '',
  'Comments are anchored to ranges of text using an Effect schema relation, so they survive edits to the surrounding prose.',
  '',
  'The companion renders each thread on a virtual stack, mirroring the chat experience while keeping the editor in sync.',
  '',
  random.lorem.paragraphs(1),
  '',
  'Select text in the editor to add a new comment, or view existing threads in the companion.',
  '',
  random.lorem.paragraphs(1),
  '',
].join('\n');

// Two story agents, each with a fixed synthetic DID so their authored suggestions are deterministic
// (no LLM). Each proposes a different revision of the document; edits in distinct paragraphs diff as
// separate reviewable cards, colour-coded per author.
const KAI_SUGGESTION = SAMPLE_CONTENT.replace(
  'This document has comment threads attached to it.',
  'This document has comment threads and inline suggestions attached to it.',
).replace(
  'The companion renders each thread on a virtual stack, mirroring the chat experience while keeping the editor in sync.',
  'The companion renders each thread and suggestion on a shared virtual stack, mirroring the chat experience while keeping the editor in sync.',
);
const NOVA_SUGGESTION = SAMPLE_CONTENT.replace(
  'Select text in the editor to add a new comment, or view existing threads in the companion.',
  'Select text in the editor to add a comment, or open the companion to review threads and suggestions.',
);

/** Two deterministic synthetic-DID authors, each proposing a distinct revision. */
export const STORY_AGENTS = [
  { did: 'did:agent:kai', name: STORY_AGENT_NAME, content: KAI_SUGGESTION },
  { did: 'did:agent:nova', name: 'Nova', content: NOVA_SUGGESTION },
];

/**
 * Seed suggestions authored by agents — deterministic, no LLM. For each agent, opens its per-author
 * `kind:'suggestion'` branch (via {@link Branch.suggestion}) and edits the content to that agent's
 * proposed revision, so the companion overlays them against the base as agent-authored suggestion
 * cards (multiple authors, each colour-coded by its own hue).
 */
export const seedAgentSuggestions = async (doc: Markdown.Document, parent: Text.Text): Promise<void> => {
  for (const agent of STORY_AGENTS) {
    const branch = await Branch.suggestion(doc, parent, agent.did);
    const binding = await Branch.bind(doc, branch);
    Obj.update(binding.object, () => {
      EchoText.update(binding.object, 'content', agent.content);
    });
    binding.dispose();
  }
};
