//
// Copyright 2026 DXOS.org
//

//
// Ride Check UI.
//

import '@dxos-theme';

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import '@dxos/react-ui/theme.css';
import { Card, Icon, Tag, Theme } from '@dxos/react-ui';

import { type Forecast, type Hour } from '../shared/types.ts';

declare const __BUILD_TIME__: string;

const VERDICT_STYLE = {
  'go': {
    hue: 'emerald',
    badge: 'border-[6px] border-emerald-border',
    text: 'text-emerald-text',
    label: 'GO',
    icon: 'ph--check-circle--regular',
    line: 'Get out there.',
  },
  'maybe': {
    hue: 'amber',
    badge: 'border-[6px] border-amber-border',
    text: 'text-amber-text',
    label: 'MAYBE',
    icon: 'ph--warning--regular',
    line: 'Rideable, with a caveat.',
  },
  'no-go': {
    hue: 'rose',
    badge: 'border-[6px] border-rose-border',
    text: 'text-rose-text',
    label: 'NO-GO',
    icon: 'ph--x-circle--regular',
    line: 'Better stay in.',
  },
} as const;

/** Local `YYYY-MM-DDTHH:mm` from Open-Meteo, shown as `3 PM`. */
const hourLabel = (time: string) => {
  const hour = Number(time.slice(11, 13));
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;
};

/** The slot after a local hour, so a block ending in the 9 AM slot reads `– 10 AM`. */
const nextHour = (time: string) => new Date(Date.parse(`${time}Z`) + 3_600_000).toISOString().slice(0, 16);

const clockLabel = (time: string) =>
  `${hourLabel(time).split(' ')[0]}:${time.slice(14, 16)} ${hourLabel(time).split(' ')[1]}`;

/** Minutes between two local timestamps of the same zone. */
const minutesBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}Z`) - Date.parse(`${from}Z`)) / 60_000);

const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

const VerdictCard = ({ forecast }: { forecast: Forecast }) => {
  const { verdict } = forecast;
  const style = VERDICT_STYLE[verdict.level];
  return (
    <Card.Root classNames='md:col-span-2' data-testid='feature.verdict'>
      <Card.Header>
        <Card.Title>Go / no-go</Card.Title>
        <Tag.Tag hue='neutral'>next 3 hours</Tag.Tag>
      </Card.Header>
      <div className='flex items-center gap-6 px-4 py-6'>
        <div
          className={`flex items-center justify-center rounded-full size-32 shrink-0 ${style.badge}`}
          data-testid='verdict.badge'
        >
          <span className={`text-2xl font-bold tracking-wider ${style.text}`}>{style.label}</span>
        </div>
        <div className='flex flex-col gap-2 min-w-0'>
          <p className='text-xl font-medium'>{style.line}</p>
          <ul className='flex flex-col gap-1 text-fg-muted'>
            {verdict.reasons.map((reason) => (
              <li key={reason} className='flex items-center gap-2'>
                <Icon.Icon icon={style.icon} hue={style.hue} />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Card.Section>
        <Card.Row icon='ph--drop--regular' trailing={<span className='tabular-nums'>{verdict.rain}%</span>}>
          Rain chance
        </Card.Row>
        <Card.Row icon='ph--wind--regular' trailing={<span className='tabular-nums'>{verdict.wind} km/h</span>}>
          Wind
        </Card.Row>
        <Card.Row
          icon='ph--thermometer-simple--regular'
          trailing={<span className='tabular-nums'>{verdict.temp}°C</span>}
        >
          Coldest
        </Card.Row>
      </Card.Section>
    </Card.Root>
  );
};

const CHART = { width: 640, height: 200, pad: 28 };

/** Rain-chance bars under a temperature line, one column per hour. */
const HourlyChart = ({ hours }: { hours: Hour[] }) => {
  const step = (CHART.width - CHART.pad * 2) / hours.length;
  const temps = hours.map((hour) => hour.temp);
  const [low, high] = [Math.min(...temps) - 2, Math.max(...temps) + 2];
  const plotHeight = CHART.height - CHART.pad * 2;
  const tempY = (temp: number) => CHART.pad + plotHeight * (1 - (temp - low) / (high - low));
  const line = hours
    .map((hour, index) => `${index === 0 ? 'M' : 'L'}${CHART.pad + step * (index + 0.5)},${tempY(hour.temp)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${CHART.width} ${CHART.height + 24}`} className='w-full' role='img' aria-label='Hourly forecast'>
      {hours.map((hour, index) => {
        const barHeight = (plotHeight * hour.rain) / 100;
        const x = CHART.pad + step * index;
        return (
          <g key={hour.time}>
            <rect
              x={x + step * 0.2}
              y={CHART.pad + plotHeight - barHeight}
              width={step * 0.6}
              height={Math.max(barHeight, 1)}
              rx={3}
              fill='var(--color-sky-text)'
              opacity={0.55}
            />
            <text x={x + step / 2} y={CHART.height + 2} textAnchor='middle' fontSize={11} fill='var(--color-fg-muted)'>
              {hourLabel(hour.time)}
            </text>
            <text
              x={x + step / 2}
              y={CHART.height + 18}
              textAnchor='middle'
              fontSize={10}
              fill='var(--color-fg-subtle)'
            >
              {Math.round(hour.wind)}
            </text>
          </g>
        );
      })}
      <path d={line} fill='none' stroke='var(--color-amber-text)' strokeWidth={2.5} strokeLinejoin='round' />
      {hours.map((hour, index) => (
        <text
          key={hour.time}
          x={CHART.pad + step * (index + 0.5)}
          y={tempY(hour.temp) - 8}
          textAnchor='middle'
          fontSize={11}
          fill='var(--color-fg)'
        >
          {Math.round(hour.temp)}°
        </text>
      ))}
    </svg>
  );
};

const HourlyCard = ({ forecast }: { forecast: Forecast }) => (
  <Card.Root classNames='md:col-span-2' data-testid='feature.hourly'>
    <Card.Header>
      <Card.Title>Next 12 hours</Card.Title>
      <div className='flex gap-2'>
        <Tag.Tag hue='amber'>°C</Tag.Tag>
        <Tag.Tag hue='sky'>rain %</Tag.Tag>
        <Tag.Tag hue='neutral'>wind km/h</Tag.Tag>
      </div>
    </Card.Header>
    <div className='px-2 pb-2'>
      <HourlyChart hours={forecast.hours} />
    </div>
  </Card.Root>
);

const WindowCard = ({ forecast }: { forecast: Forecast }) => (
  <Card.Root data-testid='feature.window'>
    <Card.Header>
      <Card.Title>Best window</Card.Title>
    </Card.Header>
    <div className='flex flex-col gap-1 px-4 pb-4'>
      {forecast.window ? (
        <>
          <p className='text-3xl font-semibold tabular-nums'>
            {hourLabel(forecast.window.start)} – {hourLabel(nextHour(forecast.window.end))}
          </p>
          <p className='text-fg-muted'>
            {forecast.window.start.slice(0, 10) === forecast.now.slice(0, 10) ? 'Today' : 'Tomorrow'} · driest, calmest
            two hours of daylight
          </p>
        </>
      ) : (
        <p className='text-fg-muted'>No daylight left in the next day.</p>
      )}
    </div>
  </Card.Root>
);

const DaylightCard = ({ forecast }: { forecast: Forecast }) => {
  const toSunset = minutesBetween(forecast.now, forecast.daylight.sunset);
  const daytime = toSunset < minutesBetween(forecast.now, forecast.daylight.sunrise);
  return (
    <Card.Root data-testid='feature.daylight'>
      <Card.Header>
        <Card.Title>Daylight</Card.Title>
      </Card.Header>
      <div className='flex flex-col gap-1 px-4 pb-4'>
        <p className='text-3xl font-semibold tabular-nums'>
          {daytime ? duration(toSunset) : clockLabel(forecast.daylight.sunrise)}
        </p>
        <p className='text-fg-muted'>
          {daytime ? `until sunset at ${clockLabel(forecast.daylight.sunset)}` : 'next sunrise · dark now'}
        </p>
      </div>
    </Card.Root>
  );
};

const App = () => {
  const [forecast, setForecast] = useState<Forecast>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    fetch(`/api/forecast${window.location.search}`)
      .then((response) => response.json())
      .then((body) => (body.error ? setError(body.error) : setForecast(body)))
      .catch((err) => setError(String(err)));
  }, []);

  return (
    <div className='min-h-screen bg-deck-surface text-fg'>
      <main className='mx-auto max-w-4xl flex flex-col gap-6 px-4 py-10'>
        <header className='flex items-end justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center justify-center rounded-lg size-12 bg-emerald-bg text-white'>
              <Icon.Icon icon='ph--bicycle--regular' size='lg' />
            </div>
            <div>
              <h1 className='text-2xl font-semibold'>Ride Check</h1>
              <p className='text-fg-muted'>Is it a good time to ride?</p>
            </div>
          </div>
          {forecast && (
            <div className='flex items-center gap-2 text-fg-muted' data-testid='place'>
              <Icon.Icon icon='ph--map-pin--regular' />
              {forecast.place.name}
            </div>
          )}
        </header>
        {error && <p className='text-error-text'>{error}</p>}
        {!forecast && !error && <p className='text-fg-muted'>Checking the sky…</p>}
        {forecast && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <VerdictCard forecast={forecast} />
            <HourlyCard forecast={forecast} />
            <WindowCard forecast={forecast} />
            <DaylightCard forecast={forecast} />
          </div>
        )}
        <footer className='flex justify-between text-sm text-fg-subtle'>
          <span>Weather: {forecast?.source ?? 'Open-Meteo'}</span>
          <span data-testid='build'>deployed {new Date(__BUILD_TIME__).toLocaleString()}</span>
        </footer>
      </main>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <Theme.Provider tx={Theme.defaultTx} themeMode='dark'>
    <App />
  </Theme.Provider>,
);
