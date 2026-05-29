//
// Copyright 2026 DXOS.org
//

// TODO(burdon): Minimal seed data. Replace with a comprehensive IATA dataset (airlines +
//   airports) — likely a generated lookup or an airport-data service — as coverage grows.

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
