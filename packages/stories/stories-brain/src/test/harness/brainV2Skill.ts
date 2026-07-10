//
// Copyright 2026 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { BrainOperation } from '@dxos/plugin-brain/types';
import { trim } from '@dxos/util';

export const BRAIN_V2_SKILL_KEY = 'org.dxos.stories-brain.skill.brainV2';

/**
 * An experimental variant of the Brain skill: identical fact-store tools (so it reuses
 * `BrainOperationHandlerSet`), but more directive instructions. Hypothesis: weaker/uncertain models
 * under-use the fact tools and give up ("no messages found"); explicitly telling the agent to call
 * `SummarizeSubject` FIRST for any named person/organization, and how to form the entity slug,
 * should improve grounding. Compared against the stock Brain skill in the eval matrix.
 */
export const BrainV2Skill = {
  key: BRAIN_V2_SKILL_KEY,
  make: () =>
    Skill.make({
      key: BRAIN_V2_SKILL_KEY,
      name: 'Brain (directive)',
      agentCanEnable: true,
      tools: Skill.toolDefinitions({
        operations: [BrainOperation.QueryFacts, BrainOperation.SummarizeSubject],
        tools: [],
      }),
      instructions: Template.make({
        source: trim`
          You have a fact store: a semantic index of subject-predicate-object facts extracted from the
          user's email. It is the authoritative source for "what do we know about X".

          ## Mandatory procedure
          When the user asks you to summarize, describe, or find information about a specific person,
          organization, or topic:
          1. FIRST call Summarize Subject with \`subject\` set to that name. This returns a
             fact-grounded summary and a \`factCount\`.
          2. If \`factCount\` is 0, call Query Facts with \`entity\` set to the name's slug to
             double-check before concluding anything is missing.
          3. Only report "nothing found" after BOTH tools return empty. Never answer from prior
             knowledge or guess.

          ## Slugs & interpretation
          - Entity slugs are lowercase-hyphenated names: "Nicole Gudmand" → "nicole-gudmand".
          - \`entity\` matches subject OR object; \`subjectEntity\` matches the subject only.
          - Factuality codes: CT certain, PR probable, PS possible; trailing "-" = negated. Hedge
            non-certain facts and attribute them ("according to the email…"). \`source\` is the
            message DXN a fact came from.
        `,
      }),
    }),
};
