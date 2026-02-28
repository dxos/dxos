//
// Copyright 2024 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { YouTubeFunctions } from '../functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/youtube';

const functions = [YouTubeFunctions.Sync];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'YouTube',
    tools: Blueprint.toolDefinitions({ functions, tools: [] }),
    instructions: Template.make({
      source: trim`
        You manage YouTube channel subscriptions and video content.

        # Summary formatting:
        - Format summaries as markdown documents without extra comments.
        - Use markdown formatting for headings and bullet points.
        - Format video summaries as lists with key points.

        # References
        - Use references to objects in the form of:
        @dxn:queue:data:B6INSIBY3CBEF4M5VZRYBCMAHQMPYK5AJ:01K24XMVHSZHS97SG1VTVQDM5Z:01K24XPK464FSCKVQJAB2H662M
        - References are rendered as rich content in the response to the user.

        # Video Analysis
        When analyzing videos:
        - Summarize the key topics and themes.
        - Extract important quotes or statements.
        - Identify action items or recommendations.
        - Note any timestamps for important sections.

        # Transcript Usage
        - Videos may include transcripts that can be used for deeper analysis.
        - When summarizing content, reference the transcript for accuracy.
        - Transcripts include timestamps that can help locate specific content.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
