//
// Copyright 2026 DXOS.org
//

// TODO(burdon): Minimal seed data. Replace with a comprehensive IATA dataset (airlines +
//   airports) — likely a generated lookup or an airport-data service — as coverage grows.

export type Airline = {
  code: string;
  name: string;
  domain: string;
};

/** IATA airline prefix → display name. Extend as needed; falls back to the sender domain. */
export const AIRLINES: Airline[] = [
  { code: 'AA', name: 'American Airlines', domain: 'aa.com' },
  { code: 'AC', name: 'Air Canada', domain: 'aircanada.com' },
  { code: 'AF', name: 'Air France', domain: 'airfrance.com' },
  { code: 'AI', name: 'Air India', domain: 'airindia.com' },
  { code: 'AS', name: 'Alaska Airlines', domain: 'alaskaair.com' },
  { code: 'AY', name: 'Finnair', domain: 'finnair.com' },
  { code: 'AZ', name: 'ITA Airways', domain: 'ita-airways.com' },
  { code: 'B6', name: 'JetBlue Airways', domain: 'jetblue.com' },
  { code: 'BA', name: 'British Airways', domain: 'britishairways.com' },
  { code: 'CA', name: 'Air China', domain: 'airchina.com' },
  { code: 'CX', name: 'Cathay Pacific', domain: 'cathaypacific.com' },
  { code: 'CZ', name: 'China Southern Airlines', domain: 'csair.com' },
  { code: 'DL', name: 'Delta Air Lines', domain: 'delta.com' },
  { code: 'EK', name: 'Emirates', domain: 'emirates.com' },
  { code: 'EY', name: 'Etihad Airways', domain: 'etihad.com' },
  { code: 'FR', name: 'Ryanair', domain: 'ryanair.com' },
  { code: 'IB', name: 'Iberia', domain: 'iberia.com' },
  { code: 'JL', name: 'Japan Airlines', domain: 'jal.com' },
  { code: 'KE', name: 'Korean Air', domain: 'koreanair.com' },
  { code: 'KL', name: 'KLM', domain: 'klm.com' },
  { code: 'LH', name: 'Lufthansa', domain: 'lufthansa.com' },
  { code: 'LX', name: 'Swiss International Air Lines', domain: 'swiss.com' },
  { code: 'MU', name: 'China Eastern Airlines', domain: 'ceair.com' },
  { code: 'NH', name: 'All Nippon Airways', domain: 'ana.co.jp' },
  { code: 'OS', name: 'Austrian Airlines', domain: 'austrian.com' },
  { code: 'QF', name: 'Qantas', domain: 'qantas.com' },
  { code: 'QR', name: 'Qatar Airways', domain: 'qatarairways.com' },
  { code: 'SQ', name: 'Singapore Airlines', domain: 'singaporeair.com' },
  { code: 'TK', name: 'Turkish Airlines', domain: 'turkishairlines.com' },
  { code: 'TP', name: 'TAP Air Portugal', domain: 'flytap.com' },
  { code: 'UA', name: 'United Airlines', domain: 'united.com' },
  { code: 'VS', name: 'Virgin Atlantic', domain: 'virginatlantic.com' },
  { code: 'WN', name: 'Southwest Airlines', domain: 'southwest.com' },
  { code: 'WY', name: 'Oman Air', domain: 'omanair.com' },
];
