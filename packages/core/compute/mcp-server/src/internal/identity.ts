//
// Copyright 2026 DXOS.org
//

/**
 * How this server presents itself, shared by every host.
 *
 * A model reads tools and instructions; a *user* reads this, in a connector list next to a dozen
 * other servers. Hosts differ in transport and deployment, not in what product they are — so a name
 * or mark chosen per host is the same class of drift as a tool description chosen per host.
 *
 * Plain strings only: the mark lives in `./icon` because only a host with an origin can serve one.
 */
export const identity = {
  name: 'DXOS Spaces',
  title: 'DXOS',
  websiteUrl: 'https://dxos.org',
} as const;
