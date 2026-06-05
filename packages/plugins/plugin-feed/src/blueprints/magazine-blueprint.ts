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
      source: trim`
        You curate articles for a Magazine. The candidate Posts are provided in the <input> as a
        JSON array under "candidates"; each candidate has an "id" plus title, description, author,
        feedName, published, and link. The Magazine's own instructions (provided to you separately)
        describe the Topic — what this magazine should cover.

        Select only the candidates that clearly match the Topic — quality over quantity. When a
        candidate's title and description are not enough to judge relevance, you MAY call
        fetchArticleContent with the candidate's id to read the full article text before deciding.

        Never select duplicate articles. Two candidates are duplicates if they share a link or guid,
        OR if their titles and content describe the same story (a fuzzy duplicate — e.g. the same
        article syndicated by different feeds). Select only one of each (prefer the most complete or
        most authoritative source) and skip the rest.

        When you are done, call completeJob with the structured output:
        { "posts": [{ "id": "<candidate id>" }, ...] }
        listing the ids of the candidates you selected, in the order you want them shown. Only use
        ids that appear in the input — never invent ids. Do not attempt to add Posts yourself; the
        Magazine is updated mechanically from your output.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: Magazine.BLUEPRINT_KEY,
  make,
};

export default blueprint;
