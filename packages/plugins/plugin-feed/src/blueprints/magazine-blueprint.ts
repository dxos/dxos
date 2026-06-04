//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { FeedOperation } from '#types';
import { Magazine } from '#types';

const operations = [
  FeedOperation.ListCandidatePosts,
  FeedOperation.FetchArticleContent,
  FeedOperation.AddPostToMagazine,
];

// TODO(burdon): This is just sync? Use routine?
const make = () =>
  Blueprint.make({
    key: Magazine.BLUEPRINT_KEY,
    name: 'Magazine Curator',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You curate articles for a Magazine from its referenced Feeds, following the Magazine's Routine instructions closely.

        Workflow:
        1. Call listCandidatePosts with the Magazine's ref to get uncurated Posts.
        2. Select only Posts that clearly match the Magazine's Routine instructions — quality over quantity.
        3. For each selected Post, call fetchArticleContent to get its text and image URLs.
        4. Produce a concise snippet of ~200 characters summarizing the article.
        5. Choose the best image URL (prefer og:image).
        6. Call addPostToMagazine with the Magazine, Post, snippet, and imageUrl.

        Skip Posts without a link. Do not re-add Posts that are already in the Magazine —
        addPostToMagazine is idempotent but you should avoid wasted fetches.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: Magazine.BLUEPRINT_KEY,
  make,
};

export default blueprint;
