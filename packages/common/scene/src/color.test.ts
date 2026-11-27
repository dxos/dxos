//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Color, colorLiteral, colorName, colorTone, formatColor, parseColor, withTone } from './color.ts';
import { portOffset, portSide, sidePort } from './element.ts';
import { resolveColor, resolvedColor, resolveFont, resolveHue } from './theme.ts';

describe('color', () => {
  test('a colour is a theme name, a name at a tone, or a CSS literal', () => {
    const decode = Schema.decodeUnknownSync(Color);
    for (const color of ['blue', 'blue/2', 'accent', 'light-blue', '#1e90ff', '#fff', 'rgb(30 144 255)']) {
      expect(decode(color)).toBe(color);
    }
    for (const color of ['', 'Blue', 'blue/', 'blue/12', 'blue/4', '#12', '#12345', '$accent', 'blue 2', 'rgb(0;x)']) {
      expect(() => decode(color)).toThrow();
    }
  });

  test('a colour reads apart and back', () => {
    expect(parseColor('blue/2')).toEqual({ kind: 'name', name: 'blue', tone: 2 });
    expect(parseColor('blue')).toEqual({ kind: 'name', name: 'blue' });
    expect(parseColor('#1e90ff')).toEqual({ kind: 'css', css: '#1e90ff' });
    expect(parseColor('not a colour')).toBeUndefined();
    expect(formatColor('blue', 2)).toBe('blue/2');
    expect(formatColor('blue')).toBe('blue');
    expect([colorName('blue/2'), colorTone('blue/2'), colorLiteral('blue/2')]).toEqual(['blue', 2, undefined]);
    expect([colorName('#fff'), colorTone('#fff'), colorLiteral('#fff')]).toEqual([undefined, undefined, '#fff']);
    expect(withTone('blue/2', 0)).toBe('blue/0');
    expect(withTone('blue/2', undefined)).toBe('blue');
    expect(withTone('#fff', 2)).toBe('#fff');
  });
});

describe('theme slots', () => {
  test('a name the theme defines resolves to what it names, at the tone the drawing states', () => {
    const theme = { colors: { accent: 'violet/1', brand: '#1e90ff', loud: 'accent' } };
    expect(resolveColor('accent', theme)).toEqual({ kind: 'name', name: 'violet', tone: 1 });
    expect(resolveColor('accent/3', theme)).toEqual({ kind: 'name', name: 'violet', tone: 3 });
    expect(resolveColor('loud', theme)).toEqual({ kind: 'name', name: 'violet', tone: 1 });
    expect(resolveColor('brand', theme)).toEqual({ kind: 'css', css: '#1e90ff' });
    expect(resolveColor('brand/1', theme)).toEqual({ kind: 'css', css: '#1e90ff', tone: 1 });
    expect(resolveHue('accent', theme)).toEqual({ hue: 'violet', tone: 1 });
    expect(resolveHue('brand', theme)).toBeUndefined();
    expect(resolvedColor('accent/3', theme)).toBe('violet/3');
  });

  test('a name no theme defines is a hue, and the diagram names keep their hues', () => {
    expect(resolveHue('teal/2')).toEqual({ hue: 'teal', tone: 2 });
    expect(resolveHue('grey')).toEqual({ hue: 'neutral' });
    expect(resolveHue('light-blue')).toEqual({ hue: 'sky' });
    expect(resolveHue('default/0')).toEqual({ tone: 0 });
    expect(resolveHue('#fff')).toBeUndefined();
  });

  test('a cycle of names ends', () => {
    expect(resolveColor('a', { colors: { a: 'b', b: 'a' } })?.kind).toBe('name');
  });

  test('a font is a slot of the theme, and an unknown slot draws as the body face', () => {
    const theme = { fonts: { display: 'Georgia, serif' } };
    expect(resolveFont('display', theme)).toBe('Georgia, serif');
    expect(resolveFont('mono', theme)).toContain('monospace');
    expect(resolveFont(undefined, theme)).toBe(resolveFont('body'));
    expect(resolveFont('unknown', theme)).toBe(resolveFont('body'));
  });
});

describe('ports', () => {
  test('a port is a point of the frame, and its side is stated or the nearest', () => {
    expect(sidePort('p', 'right', 0.25)).toEqual({ id: 'p', x: 1, y: 0.25, side: 'right' });
    expect(sidePort('p', 'top', 0.5, 'in')).toEqual({ id: 'p', x: 0.5, y: 0, side: 'top', accepts: 'in' });
    expect(portSide({ x: 0.5, y: 0 })).toBe('top');
    expect(portSide({ x: 1, y: 0.4 })).toBe('right');
    expect(portSide({ x: 0.2, y: 1 })).toBe('bottom');
    expect(portSide({ x: 0, y: 0.7 })).toBe('left');
    expect(portSide({ x: 0, y: 0.7, side: 'top' })).toBe('top');
    expect(portOffset({ x: 1, y: 0.25 })).toBe(0.25);
    expect(portOffset({ x: 0.75, y: 1 })).toBe(0.75);
  });
});
