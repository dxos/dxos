//
// Copyright 2025 DXOS.org
//

// Kept out of `TextCrawl.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so constants exported beside them force a full page reload on every edit.

// TODO(burdon): Factor out to theme?
export type Size = 'sm' | 'md' | 'lg';
export const sizes: Size[] = ['sm', 'md', 'lg'];
