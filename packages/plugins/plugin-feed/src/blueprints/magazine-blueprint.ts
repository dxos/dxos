//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { FeedOperation } from '#operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.magazine';

const operations = [
  FeedOperation.ListCandidatePosts,
  FeedOperation.FetchArticleContent,
  FeedOperation.AddPostToMagazine,
];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Magazine Curator',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You curate articles for a Magazine from its referenced Feeds, following the Magazine's instructions text closely.

        Workflow:
        1. Call listCandidatePosts with the Magazine's ref to get uncurated Posts.
        2. Select only Posts that clearly match the Magazine's instructions — quality over quantity.
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
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
