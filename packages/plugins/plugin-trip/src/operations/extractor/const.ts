//
// Copyright 2026 DXOS.org
//

// TODO(burdon): Minimal seed data. Replace with a comprehensive IATA dataset (airlines +
//   airports) — likely a generated lookup or an airport-data service — as coverage grows.

/**
 * Known airline sender domains used by the trip extractor's cheap `match()` pre-filter. Unknown
 * carriers still match via travel-related subject keywords, so this only needs the common cases.
 * Subdomains (e.g. `email.klm.com`) match too. Extend alongside {@link AIRLINE_NAMES}.
 */
export const AIRLINE_DOMAINS: readonly string[] = [
  'united.com',
  'klm.com',
  'klm.nl',
  'airfrance.com',
  'airfrance.fr',
  'flyingblue.com',
  'delta.com',
  'lufthansa.com',
  'britishairways.com',
  'ba.com',
  'iberia.com',
  'aa.com',
  'americanairlines.com',
  'tap.pt',
  'flytap.com',
];

/** IATA airline prefix → display name. Extend as needed; falls back to the sender domain. */
export const AIRLINE_NAMES: Record<string, string> = {
  AA: 'American Airlines',
  AF: 'Air France',
  BA: 'British Airways',
  DL: 'Delta Air Lines',
  IB: 'Iberia',
  KL: 'KLM',
  LH: 'Lufthansa',
  TP: 'TAP Air Portugal',
  UA: 'United Airlines',
};
