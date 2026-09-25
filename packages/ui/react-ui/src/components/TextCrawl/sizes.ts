//
// Copyright 2025 DXOS.org
//

// Kept out of `TextCrawl.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so constants exported beside them force a full page reload on every edit.

// Named for the crawl rather than borrowed from the theme: this is a line-height scale, and
// `@dxos/ui-types` already exports a `Size` that react-ui re-exports and means something else.
// TODO(burdon): Factor out to theme?
export type TextCrawlSize = 'sm' | 'md' | 'lg';
export const textCrawlSizes: TextCrawlSize[] = ['sm', 'md', 'lg'];
