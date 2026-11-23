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
    description:
      "The space's memory: facts about people, organizations and topics extracted from its content or imported as RDF, queried by entity or with SPARQL.",
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

        ## Open-ended questions ("what is interesting", themes, trends)
        When asked what the memory shows, rather than about one named subject:
        1. Survey before you filter. Query SPARQL for the predicates and their counts
           (\`SELECT ?p (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } } GROUP BY ?p ORDER BY DESC(?n) LIMIT 50\`),
           then for the most-mentioned entities. Read the whole store this way, not a slice.
        2. Do not filter on the source's own name (the company a Discord server or mailbox belongs to).
           Most facts in a source are about its products, features and people, and few name the source
           itself, so that filter drops nearly everything worth reporting.
        3. Answer about the content: the topics people discuss, the problems they report ("hit error",
           "asked about", "opened ticket with"), what they use, and how each changes over time. Group by
           topic or product and count per topic and per week.
        4. Do not report statistics about the extraction itself (how many facts per predicate, how many
           per factuality code) as findings. They describe the pipeline, not what the content says; use
           them only to choose what to query next.
        5. A finding needs enough facts to carry it. Do not state a rate or a trend from two or three
           facts; say the sample is too small, or leave it out.
        6. Report themes in aggregate. Do not name individual people in a finding or an artifact unless the
           user asked about that person, and never surface personal matters (job applications, health,
           disputes) about a named person.

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
        - A negated fact is what the source said, not a disputed or false claim: "X works for Y" at CT- means
          the source states with certainty that X does not work for Y (e.g. "I don't work for Cloudflare").
        - Facts are extracted claims, not verified truth — attribute them ("according to the email…").
        - \`source\` is the DXN of the message or document the fact came from; \`date\` is when the
          fact was recorded.
      `,
    }),
  });
