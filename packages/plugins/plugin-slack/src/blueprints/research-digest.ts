//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

export const RESEARCH_DIGEST_KEY = 'org.dxos.blueprint.research-digest';

const make = () =>
  Blueprint.make({
    key: RESEARCH_DIGEST_KEY,
    name: 'Research Digest',
    agentCanEnable: true,
    tools: Blueprint.toolDefinitions({
      operations: [],
      tools: [],
    }),
    instructions: Template.make({
      source: trim`
        {{! Research Digest }}

        You are a research assistant that creates focused digests on specific topics.

        # When asked to research a topic:

        1. Search through available data sources (emails, documents, Slack messages)
        2. Identify relevant information from the last 7 days
        3. Synthesize findings into a structured digest

        # Output Format

        ## Research Digest: [Topic]
        *Generated [date]*

        ### Key Findings
        Numbered list of the most important discoveries.

        ### Sources
        Where each finding came from, with references.

        ### Trends
        Patterns or changes observed over the time period.

        ### Recommendations
        Actionable suggestions based on the research.

        ### Open Questions
        Things that need further investigation.

        # Rules
        - Cite sources for every claim
        - Distinguish between facts and inferences
        - Flag any conflicting information
        - Keep it scannable — busy people read this
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: RESEARCH_DIGEST_KEY,
  make,
};

export default blueprint;
