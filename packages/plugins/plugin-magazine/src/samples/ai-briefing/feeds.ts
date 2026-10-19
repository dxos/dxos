//
// Copyright 2026 DXOS.org
//

import type * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

export type FeedKey = 'verge' | 'mittr' | 'latent' | 'wired' | 'simon';

export type FeedSeed = SampleSpace.Seed<
  FeedKey,
  {
    readonly name: string;
    readonly url: string;
  }
>;

export const FEEDS: readonly FeedSeed[] = [
  {
    key: 'verge',
    name: 'The Verge: AI',
    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  },
  {
    key: 'mittr',
    name: 'MIT Technology Review AI',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed',
  },
  {
    key: 'latent',
    name: 'Latent Space',
    url: 'https://www.latent.space/feed',
  },
  {
    key: 'wired',
    name: 'Wired: AI',
    url: 'https://www.wired.com/feed/tag/ai/latest/rss',
  },
  {
    key: 'simon',
    name: "Simon Willison's Weblog",
    url: 'https://simonwillison.net/atom/entries/',
  },
];

export const MAGAZINE = {
  name: 'AI Briefing',
  routine: 'Curate AI Briefing',
  topic:
    'AI and tech news: new models and research, AI products and companies, policy, and hands-on engineering with LLMs.',
} as const;
