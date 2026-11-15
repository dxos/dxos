//
// Copyright 2026 DXOS.org
//

// The team's own organization as plain data, with no imports, so a reader with no space (the docs site's gallery) can
// show it.

export const FIELDSTONE_SEED = {
  key: 'alienlabs',
  logo: { color: '#0f172a', mark: 'saucer' },
  name: 'Alien Labs',
  status: 'active',
  website: 'https://alienlabs.io',
  description:
    'Builds Cairn, a hosted build cache for monorepos, on DXOS: the dashboard is a Composer plugin and the agents run on EDGE. Remote team, Lisbon and Toronto.',
} as const;
