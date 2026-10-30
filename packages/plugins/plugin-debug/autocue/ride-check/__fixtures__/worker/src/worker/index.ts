//
// Copyright 2026 DXOS.org
//

//
// Ride Check Worker: answers /api/forecast from Open-Meteo and serves the UI as static assets.
//

import { type Forecast, type Hour, type Verdict, type Window } from '../shared/types.ts';

type Env = { ASSETS: Fetcher };

/** San Francisco's Golden Gate loop, so the page has something to show before the rider picks a place. */
const DEFAULT_PLACE = { name: 'Golden Gate loop', lat: 37.8078, lon: -122.475 };

/** F-1: the next three hours decide whether to go now. */
const VERDICT_HOURS = 3;

/** F-3: the best window is a two-hour block of daylight. */
const WINDOW_HOURS = 2;

const openMeteoUrl = (lat: number, lon: number) => {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set(
    'hourly',
    'temperature_2m,precipitation_probability,wind_speed_10m,wind_gusts_10m,weather_code,is_day',
  );
  url.searchParams.set('daily', 'sunrise,sunset');
  url.searchParams.set('current', 'temperature_2m,wind_speed_10m,wind_gusts_10m');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('wind_speed_unit', 'kmh');
  return url.toString();
};

type OpenMeteo = {
  timezone: string;
  utc_offset_seconds: number;
  current: { time: string };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    weather_code: number[];
    is_day: number[];
  };
  daily: { sunrise: string[]; sunset: string[] };
};

/** F-1: go / maybe / no-go with the reasons a rider would want to read. */
const verdictFor = (hours: Hour[]): Verdict => {
  const next = hours.slice(0, VERDICT_HOURS);
  const rain = Math.max(...next.map((hour) => hour.rain));
  const wind = Math.max(...next.map((hour) => hour.wind));
  const cold = Math.min(...next.map((hour) => hour.temp));
  const reasons: string[] = [];
  let level: Verdict['level'] = 'go';
  const worsen = (to: Verdict['level']) => {
    if (to === 'no-go' || (to === 'maybe' && level === 'go')) {
      level = to;
    }
  };

  if (rain > 50) {
    worsen('no-go');
    reasons.push(`Rain likely (${rain}%)`);
  } else if (rain > 25) {
    worsen('maybe');
    reasons.push(`Chance of showers (${rain}%)`);
  }
  if (wind > 35) {
    worsen('no-go');
    reasons.push(`Strong wind (${Math.round(wind)} km/h)`);
  } else if (wind > 25) {
    worsen('maybe');
    reasons.push(`Breezy (${Math.round(wind)} km/h)`);
  }
  if (cold < 4) {
    worsen('no-go');
    reasons.push(`Near freezing (${Math.round(cold)}°C)`);
  }
  if (reasons.length === 0) {
    reasons.push('Dry, calm and mild for the next three hours');
  }

  return { level, reasons, rain, wind: Math.round(wind), temp: Math.round(cold) };
};

/** F-3: score a block by how wet, windy and cold it is; lower is better. */
const bestWindow = (hours: Hour[]): Window | undefined => {
  const score = (hour: Hour) => hour.rain + hour.wind * 1.5 + Math.max(0, 12 - hour.temp) * 3;
  let best: Window | undefined;
  for (let start = 0; start + WINDOW_HOURS <= hours.length; start++) {
    const block = hours.slice(start, start + WINDOW_HOURS);
    if (!block.every((hour) => hour.day)) {
      continue;
    }
    const total = block.reduce((sum, hour) => sum + score(hour), 0);
    if (!best || total < best.score) {
      best = { start: block[0].time, end: block[block.length - 1].time, score: total };
    }
  }
  return best;
};

const forecast = async (url: URL): Promise<Forecast> => {
  const lat = Number(url.searchParams.get('lat') ?? DEFAULT_PLACE.lat);
  const lon = Number(url.searchParams.get('lon') ?? DEFAULT_PLACE.lon);
  const name = url.searchParams.get('name') ?? DEFAULT_PLACE.name;
  const response = await fetch(openMeteoUrl(lat, lon), { cf: { cacheTtl: 600 } });
  if (!response.ok) {
    throw new Error(`Open-Meteo answered ${response.status}`);
  }
  const data: OpenMeteo = await response.json();

  // Hourly slots start at local midnight; drop the ones already past.
  const nowHour = data.current.time.slice(0, 13);
  const first = Math.max(
    0,
    data.hourly.time.findIndex((time) => time.slice(0, 13) === nowHour),
  );
  const hours: Hour[] = data.hourly.time.slice(first, first + 24).map((time, index) => {
    const at = first + index;
    return {
      time,
      temp: data.hourly.temperature_2m[at],
      rain: data.hourly.precipitation_probability[at],
      wind: data.hourly.wind_speed_10m[at],
      gusts: data.hourly.wind_gusts_10m[at],
      code: data.hourly.weather_code[at],
      day: data.hourly.is_day[at] === 1,
    };
  });

  const sunset = data.daily.sunset.find((time) => time > data.current.time) ?? data.daily.sunset[1];
  const sunrise = data.daily.sunrise.find((time) => time > data.current.time) ?? data.daily.sunrise[1];

  return {
    place: { name, lat, lon },
    timezone: data.timezone,
    now: data.current.time,
    verdict: verdictFor(hours),
    hours: hours.slice(0, 12),
    window: bestWindow(hours),
    daylight: { sunrise, sunset },
    source: 'Open-Meteo',
  };
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/forecast') {
      try {
        return Response.json(await forecast(url), { headers: { 'cache-control': 'no-store' } });
      } catch (error) {
        return Response.json({ error: String(error) }, { status: 502 });
      }
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
