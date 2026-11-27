//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { readStyle, toStyle } from './style.ts';

describe('excalidraw style', () => {
  test('a palette name draws in its own color and reads back as the name', ({ expect }) => {
    const style = toStyle({ color: 'blue', fill: 'solid', stroke: 'dashed' });
    expect(style).toMatchObject({ strokeColor: '#4263eb', backgroundColor: '#4263eb', strokeStyle: 'dashed' });
    expect(readStyle(style)).toEqual({ color: 'blue', fill: 'solid', stroke: 'dashed' });
    // An element that states no color draws in the ink, and reads back stating none.
    expect(toStyle({}).strokeColor).toBe('#1e1e1e');
    expect(readStyle(toStyle({}))).toEqual({});
  });

  test('a name at a tone draws as the palette name, and at the lightest tone as its light twin', ({ expect }) => {
    expect(toStyle({ color: 'blue/2' }).strokeColor).toBe('#4263eb');
    expect(toStyle({ color: 'blue/3' }).strokeColor).toBe('#4dabf7');
    expect(readStyle(toStyle({ color: 'blue/3' })).color).toBe('light-blue');
  });

  test('a CSS color draws as written and reads back as itself', ({ expect }) => {
    const style = toStyle({ color: '#1e90ff', fill: 'solid' });
    expect(style).toMatchObject({ strokeColor: '#1e90ff', backgroundColor: '#1e90ff' });
    expect(readStyle(style)).toMatchObject({ color: '#1e90ff', fill: 'solid' });
  });

  test('a hue the palette lacks draws in the ink', ({ expect }) => {
    expect(toStyle({ color: 'teal' }).strokeColor).toBe('#1e1e1e');
  });

  test('an outline of none and a glass fill take the nearest excalidraw has', ({ expect }) => {
    expect(toStyle({ stroke: 'none' })).toMatchObject({ strokeStyle: 'solid', roughness: 1 });
    expect(toStyle({ color: 'red', fill: 'glass' })).toMatchObject({ backgroundColor: '#e03131', fillStyle: 'solid' });
  });
});
