//
// Copyright 2026 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { BrainOperation } from '#types';

export const SKILL_KEY = 'org.dxos.skill.brain';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Brain',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({
      operations: [BrainOperation.QueryFacts, BrainOperation.SummarizeSubject],
      tools: [],
    }),
    instructions: Template.make({
      source: trim`
        The space's fact store is a semantic index of subject-predicate-object facts extracted from
        the user's content (email and other sources). It is the authoritative source for "what do we
        know about X".

        ## Procedure (do this first)
        When asked to summarize, describe, or find information about a specific person, organization,
        or topic:
        1. FIRST call Summarize Subject with \`subject\` set to that name — it returns a fact-grounded
           summary plus a \`factCount\`.
        2. If \`factCount\` is 0, call Query Facts with \`entity\` set to the name's slug to
           double-check before concluding anything is missing.
        3. Report "nothing found" only after BOTH tools return empty. Never answer from prior
           knowledge or guess.

        ## Using the tools
        - Entity slugs are lowercase-hyphenated forms of names: "Alice Smith" → "alice-smith".
        - Query Facts: use \`entity\` to match facts where the entity appears as subject OR object;
          use \`subjectEntity\` to match the subject position only. Start broad (just \`entity\`), then
          narrow iteratively with \`predicate\` or \`minConfidence\` (e.g. 0.8) when there are too many
          results. \`source\` filters to facts extracted from one message/document DXN.
        - Summarize Subject: produces a grounded, fact-cited summary of one person, organization, or
          topic; pass \`focus\` to angle it (e.g. "commitments", "recent activity").

        ## Interpreting results
        - Factuality codes: CT certain, PR probable, PS possible; a trailing "-" means the statement
          is negated; "CTu"/"Uu" mean unknown. Hedge non-certain facts when relaying them.
        - Facts are extracted claims, not verified truth — attribute them ("according to the email…").
        - \`source\` is the DXN of the message or document the fact came from; \`date\` is when the
          fact was recorded.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
