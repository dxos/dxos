//
// Copyright 2026 DXOS.org
//

//
// The /api/forecast contract, shared by the Worker and the UI.
//

export type Hour = {
  /** Local time, ISO without offset (Open-Meteo `timezone=auto`). */
  time: string;
  temp: number;
  /** Precipitation probability, percent. */
  rain: number;
  /** Wind speed, km/h. */
  wind: number;
  /** Wind gusts, km/h. */
  gusts: number;
  code: number;
  day: boolean;
};

export type Verdict = {
  level: 'go' | 'maybe' | 'no-go';
  reasons: string[];
  rain: number;
  wind: number;
  temp: number;
  gusts?: number;
};

export type Window = { start: string; end: string; score: number };

export type Forecast = {
  place: { name: string; lat: number; lon: number };
  timezone: string;
  now: string;
  verdict: Verdict;
  hours: Hour[];
  window?: Window;
  daylight: { sunrise: string; sunset: string };
  source: string;
};
