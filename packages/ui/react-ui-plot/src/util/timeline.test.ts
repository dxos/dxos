//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  categoryLabel,
  createTimelineFraction,
  evenFraction,
  fitLabel,
  fitTimelineHeight,
  groupCategories,
  matchesTimelineFilter,
  orderCategories,
  spreadLabels,
  timelineFraction,
  timelineRange,
  toTime,
  toTimelineEvents,
} from './timeline.ts';

describe('toTime', () => {
  test('small integers and digit strings are years', ({ expect }) => {
    expect(toTime(1980)).to.deep.eq({ time: Date.UTC(1980, 0, 1), date: '1980' });
    expect(toTime('2024')?.date).to.eq('2024');
  });

  test('large numbers are date serials', ({ expect }) => {
    expect(toTime(45_658)?.time).to.eq(Date.UTC(2025, 0, 1));
  });

  test('year-month strings are months', ({ expect }) => {
    expect(toTime('1981-08')).to.deep.eq({ time: Date.UTC(1981, 7, 1), date: 'Aug 1981' });
  });

  test('date strings parse', ({ expect }) => {
    expect(toTime('2026-03-20')?.date).to.eq('Mar 20, 2026');
    expect(toTime('not a date')).to.be.undefined;
    expect(toTime(null)).to.be.undefined;
  });
});

describe('toTimelineEvents', () => {
  test('one event per row, sorted by time, with categories in order of appearance', ({ expect }) => {
    const { columns, events } = toTimelineEvents({
      columns: ['Year', 'Category', 'Event', 'Description'],
      rows: [
        [2000, 'Macro', 'Crash', 'The Nasdaq falls.', 'https://example.com/crash.png'],
        [1995, 'Tech', 'JavaScript', null],
        ['?', 'Tech', 'Skipped', null],
        [1996, 'Tech', null, 'Untitled rows are skipped.'],
      ],
    });
    expect(columns).to.deep.eq(['Macro', 'Tech']);
    expect(events.map((event) => event.label)).to.deep.eq(['JavaScript', 'Crash']);
    expect(events[0].description).to.be.undefined;
    expect(events[1].description).to.eq('The Nasdaq falls.');
    expect(events[1].image).to.eq('https://example.com/crash.png');
  });
});

describe('timelineFraction', () => {
  const range: [number, number] = [0, 100];

  test('linear is proportional', ({ expect }) => {
    expect(timelineFraction(25, range)).to.eq(0.25);
  });

  test('log keeps the ends and gives the recent past more room', ({ expect }) => {
    expect(timelineFraction(0, range, 'log')).to.eq(0);
    expect(timelineFraction(100, range, 'log')).to.eq(1);
    expect(timelineFraction(90, range, 'log')).to.be.lessThan(0.8);
    expect(timelineFraction(10, range, 'log')).to.be.greaterThan(0.01);
  });
});

describe('timelineRange', () => {
  test('explicit bounds win over the rounded extent', ({ expect }) => {
    const { events } = toTimelineEvents({
      columns: ['Year', 'Category', 'Event'],
      rows: [
        [1983, 'A', 'x'],
        [2017, 'A', 'y'],
      ],
    });
    const range = timelineRange(events);
    expect(range?.[0]).to.be.at.most(Date.UTC(1983, 0, 1));
    expect(range?.[1]).to.be.at.least(Date.UTC(2017, 0, 1));
    expect(timelineRange(events, { start: '1980', end: '2030' })).to.deep.eq([
      Date.UTC(1980, 0, 1),
      Date.UTC(2030, 0, 1),
    ]);
  });
});

describe('spreadLabels', () => {
  test('keeps order and minimum gap within bounds', ({ expect }) => {
    expect(spreadLabels([10, 12, 14], 10, 0, 100)).to.deep.eq([10, 20, 30]);
    expect(spreadLabels([95, 96], 10, 0, 100)).to.deep.eq([90, 100]);
  });
});

describe('fitTimelineHeight', () => {
  const options = { minHeight: 100, gap: 10, maxDrift: 20, padding: 0 };

  test('sparse lanes keep the minimum height', ({ expect }) => {
    expect(fitTimelineHeight([[0, 0.5, 1]], options)).to.eq(100);
  });

  test('crowded lanes grow until labels stay near their events', ({ expect }) => {
    const crowded = Array.from({ length: 20 }, (_, index) => 0.9 + index * 0.005);
    const height = fitTimelineHeight([crowded], options);
    expect(height).to.be.greaterThan(100);
    const positions = crowded.map((fraction) => fraction * height);
    const spread = spreadLabels(positions, 10, 0, height);
    expect(Math.max(...spread.map((position, index) => Math.abs(position - positions[index])))).to.be.at.most(20);
  });

  test('events at the same time do not force growth', ({ expect }) => {
    expect(fitTimelineHeight([[0.5, 0.5, 0.5, 0.5, 0.5, 0.5]], options)).to.eq(100);
  });
});

describe('matchesTimelineFilter', () => {
  const event = {
    id: '0',
    time: 0,
    date: 'Oct 1987',
    column: 'FIC',
    label: 'Black Monday',
    description: 'The Dow falls.',
  };

  test('matches title, description, category and date, ignoring case', ({ expect }) => {
    expect(matchesTimelineFilter(event, 'black')).to.be.true;
    expect(matchesTimelineFilter(event, 'DOW')).to.be.true;
    expect(matchesTimelineFilter(event, 'fic')).to.be.true;
    expect(matchesTimelineFilter(event, '1987')).to.be.true;
    expect(matchesTimelineFilter(event, 'robot')).to.be.false;
  });

  test('empty text matches everything', ({ expect }) => {
    expect(matchesTimelineFilter(event, '  ')).to.be.true;
    expect(matchesTimelineFilter(event, undefined)).to.be.true;
  });
});

describe('fitLabel', () => {
  // Every character is half the font size wide.
  const measure = (text: string) => text.length / 2;
  const sizes = { min: 10, max: 15 };

  test('short labels take the maximum size', ({ expect }) => {
    expect(fitLabel({ prefix: '1987', text: 'Crash' }, 200, measure, sizes)).to.deep.eq({
      text: 'Crash',
      fontSize: 15,
    });
  });

  test('longer labels shrink to fit', ({ expect }) => {
    // "1987 Black Monday" is 17 characters: 8.5 per pixel of font size.
    expect(fitLabel({ prefix: '1987', text: 'Black Monday' }, 102, measure, sizes).fontSize).to.eq(12);
  });

  test('labels that do not fit at the minimum are cut short, keeping the prefix', ({ expect }) => {
    const { text, fontSize } = fitLabel({ prefix: '1987', text: 'Black Monday' }, 60, measure, sizes);
    expect(fontSize).to.eq(10);
    expect(text).to.eq('Black…');
  });
});

describe('evenFraction', () => {
  const times = [0, 10, 1000];

  test('event times are spaced equally', ({ expect }) => {
    expect(times.map((time) => evenFraction(time, times))).to.deep.eq([0, 0.5, 1]);
  });

  test('times between events fall between their positions', ({ expect }) => {
    expect(evenFraction(5, times)).to.eq(0.25);
    expect(evenFraction(505, times)).to.eq(0.75);
  });

  test('times outside the events clamp to the ends', ({ expect }) => {
    expect(evenFraction(-5, times)).to.eq(0);
    expect(evenFraction(2000, times)).to.eq(1);
  });

  test('the compact scale ignores duplicate times', ({ expect }) => {
    const fraction = createTimelineFraction('compact', [0, 1000], [10, 0, 10, 1000]);
    expect(fraction(10)).to.eq(0.5);
  });
});

describe('groupCategories', () => {
  test('groups paths by parent in order of appearance; plain categories stand alone', ({ expect }) => {
    expect(groupCategories(['Tech/AI', 'Macro', 'Tech/Software', 'Complex/MIC'])).to.deep.eq([
      { name: 'Tech', categories: ['Tech/AI', 'Tech/Software'] },
      { name: 'Macro', categories: ['Macro'] },
      { name: 'Complex', categories: ['Complex/MIC'] },
    ]);
  });

  test('a category is labelled by its last segment', ({ expect }) => {
    expect(categoryLabel('Tech/AI')).to.eq('AI');
    expect(categoryLabel('Macro')).to.eq('Macro');
  });
});

describe('orderCategories', () => {
  test('listed categories come first in the given order; the rest keep theirs', ({ expect }) => {
    expect(orderCategories(['Macro/MIC', 'Tech', 'Macro/FIC', 'Other'], ['Macro/FIC', 'Macro/MIC'])).to.deep.eq([
      'Macro/FIC',
      'Macro/MIC',
      'Tech',
      'Other',
    ]);
  });
});
