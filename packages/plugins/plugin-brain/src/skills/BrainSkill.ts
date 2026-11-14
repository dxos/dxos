//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { BrainOperation } from '#types';

export const key = 'org.dxos.skill.brain';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Brain',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({
      operations: [BrainOperation.QueryFacts, BrainOperation.QuerySparql, BrainOperation.SummarizeSubject],
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
        2. If \`factCount\` is 0, call Query Facts with \`entity\` set to the name to double-check
           before concluding anything is missing.
        3. Report "nothing found" only after BOTH tools return empty. Never answer from prior
           knowledge or guess.

        ## Using the tools
        - Name entities as they are written ("Alice Smith", "dmaretskyi"): the tools match the name's slug
          ("alice-smith") and every entity labelled with the name, including those with an IRI of their own
          (e.g. a Discord user, https://discord.com/users/<id>). An IRI is matched exactly.
        - Query Facts: use \`entity\` to match facts where the entity appears as subject OR object;
          use \`subjectEntity\` to match the subject position only. Start broad (just \`entity\`), then
          narrow iteratively with \`predicate\` or \`minConfidence\` (e.g. 0.8) when there are too many
          results. \`source\` filters to facts extracted from one message/document DXN.
        - Summarize Subject: produces a grounded, fact-cited summary of one person, organization, or
          topic; pass \`focus\` to angle it (e.g. "commitments", "recent activity").
        - Query SPARQL: runs a raw SPARQL SELECT over the store, for questions the structured filters
          cannot express (counts, entities of a class, labels, joins across facts). Each fact is a named
          graph of statements. Only SELECT is allowed; updates are refused.

        ## Reading large results in windows
        Every fact tool returns at most 50 rows per call and cuts long values. When a response carries a
        \`note\`, the output was truncated: do not treat it as complete. Read the rest in windows —
        Query Facts with \`limit\` and \`offset\`, Query SPARQL with \`LIMIT\` and \`OFFSET\`. Always
        write a \`LIMIT\` (at most 50) in a SPARQL query, and use \`total\` to know how many rows remain.

        ## Interpreting results
        - Factuality codes: CT certain, PR probable, PS possible; a trailing "-" means the statement
          is negated; "CTu"/"Uu" mean unknown. Hedge non-certain facts when relaying them.
        - Facts are extracted claims, not verified truth — attribute them ("according to the email…").
        - \`source\` is the DXN of the message or document the fact came from; \`date\` is when the
          fact was recorded.
      `,
    }),
  });
