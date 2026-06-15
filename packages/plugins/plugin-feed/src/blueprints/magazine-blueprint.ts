//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { FeedOperation } from '#types';
import { Magazine } from '#types';

const operations = [FeedOperation.FetchArticleContent];

// TODO(burdon): This is just sync? Use routine?
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

        For each candidate you select, also produce:
        - "snippet": a concise 1-2 sentence summary that captures why this article is relevant to
          the Topic. Write it in plain text (no markdown). If you call fetchArticleContent, use the
          full article body to write a richer snippet; otherwise derive it from the title and
          description.
        - "imageUrl": the URL of the best hero image for the article. Look for it in the
          description HTML (an <img> src), or in the article body fetched via fetchArticleContent.
          Omit the field entirely if no image URL is available.

        When you are done, call completeJob with the structured output:
        { "posts": [{ "id": "<candidate id>", "snippet": "...", "imageUrl": "..." }, ...] }
        listing the selected candidates in the order you want them shown. Only use ids that appear
        in the input — never invent ids. Do not attempt to add Posts yourself; the Magazine is
        updated mechanically from your output.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: Magazine.BLUEPRINT_KEY,
  make,
};

export default blueprint;
