//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { FeedOperation } from '#types';
import { Magazine } from '#types';

const operations = [FeedOperation.FetchArticleContent];

const make = () =>
  Blueprint.make({
    key: Magazine.BLUEPRINT_KEY,
    name: 'Magazine Curator',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      // HOW only: input shape, tool usage, and the completeJob output contract. The editorial
      // methodology (what to select, dedup, snippet/image guidance) and the magazine's topic live on
      // the Routine's instructions (see Magazine.DEFAULT_INSTRUCTIONS), not here.
      source: trim`
        The candidate Posts are provided in the <input> as a JSON array under "candidates"; each
        candidate has an "id" plus title, description, author, feedName, published, and link. The
        editorial brief (the Topic and selection guidance) is provided in your instructions.

        When a candidate's title and description are not enough to judge relevance, you MAY call
        fetchArticleContent with the candidate's id to read the full article text (and find an image)
        before deciding.

        When you are done, call completeJob with the structured output:
        { "posts": [{ "id": "<candidate id>", "snippet": "...", "imageUrl": "..." }, ...] }
        listing the selected candidates in the order you want them shown. Only use ids that appear
        in the input — never invent ids. Omit "imageUrl" when no image is available. Do not attempt to
        add Posts yourself; the Magazine is updated mechanically from your output.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: Magazine.BLUEPRINT_KEY,
  make,
};

export default blueprint;
