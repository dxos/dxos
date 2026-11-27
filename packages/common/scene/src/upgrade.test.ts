//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Link, RectNode, Style2D } from './element.ts';
import type * as Scene from './Scene.ts';
import { Style3D } from './style.ts';
import {
  retypeContainers,
  upgradeConstraint,
  upgradeDocument,
  upgradeElement2D,
  upgradeElement3D,
  upgradeLink,
  upgradeNode,
  upgradeNodeOrLink,
  upgradePort,
  upgradeShape,
  upgradeStyle,
  upgradeStyleClass,
} from './upgrade.ts';

describe('upgrade', () => {
  test('a style states its colour, stroke, fill, corners, font and alignment in the current words', () => {
    const upgraded = upgradeStyle({
      hue: 'blue',
      tone: 1,
      textHue: 'red',
      textTone: 3,
      lineStyle: 'dashed',
      border: true,
      fill: true,
      rounded: false,
      fontFamily: 'monospace',
      alignHorizontal: 'left',
      alignVertical: 'top',
      opacity: 0.5,
      fontSize: 12,
      guide: true,
    });
    expect(upgraded).toEqual({
      color: 'blue/1',
      textColor: 'red/3',
      stroke: 'dashed',
      fill: 'solid',
      corners: 'none',
      font: 'mono',
      align: 'left',
      valign: 'top',
      opacity: 0.5,
      fontSize: 12,
      guide: true,
    });
    expect(Schema.decodeUnknownSync(Style2D, { onExcessProperty: 'error' })(upgraded)).toEqual(upgraded);
  });

  test('each legacy field reads alone', () => {
    expect(upgradeStyle({ hue: 'green' })).toEqual({ color: 'green' });
    expect(upgradeStyle({ tone: 0 })).toEqual({ color: 'default/0' });
    expect(upgradeStyle({ textTone: 3 })).toEqual({});
    expect(upgradeStyle({ border: false, lineStyle: 'dotted' })).toEqual({ stroke: 'none' });
    expect(upgradeStyle({ border: true })).toEqual({ stroke: 'solid' });
    expect(upgradeStyle({ fill: false })).toEqual({ fill: 'none' });
    expect(upgradeStyle({ pattern: true })).toEqual({ fill: 'pattern' });
    expect(upgradeStyle({ rounded: true })).toEqual({ corners: 'all' });
    expect(upgradeStyle({ fontFamily: 'default' })).toEqual({});
    expect(upgradeStyle(undefined)).toBeUndefined();
  });

  test('a 3D style takes its surface as its fill', () => {
    const upgraded = upgradeStyle({
      hue: 'sky',
      tone: 3,
      surface: 'glass',
      border: false,
      rounded: true,
      metalness: 1,
    });
    expect(upgraded).toEqual({ color: 'sky/3', fill: 'glass', stroke: 'none', corners: 'all', metalness: 1 });
    expect(Schema.decodeUnknownSync(Style3D, { onExcessProperty: 'error' })(upgraded)).toEqual(upgraded);
  });

  test('a current style is returned as it is', () => {
    const style = { color: 'blue/2', stroke: 'sketchy', fill: 'tint', corners: 'top', font: 'mono', align: 'right' };
    expect(upgradeStyle(style)).toEqual(style);
    expect(upgradeStyle(upgradeStyle({ hue: 'blue', tone: 2, border: false }))).toEqual({
      color: 'blue/2',
      stroke: 'none',
    });
  });

  test('a port sits where its side and offset put it', () => {
    expect(upgradePort({ id: 'p', side: 'e', offset: 0.25 })).toEqual({ id: 'p', x: 1, y: 0.25, side: 'right' });
    expect(upgradePort({ id: 'p', side: 'n', offset: 0.5, accepts: 'in' })).toEqual({
      id: 'p',
      x: 0.5,
      y: 0,
      side: 'top',
      accepts: 'in',
    });
    expect(upgradePort({ id: 'p', x: 0, y: 0.5, side: 'left' })).toEqual({ id: 'p', x: 0, y: 0.5, side: 'left' });
    expect(upgradePort({ id: 'p' })).toBeUndefined();
  });

  test('a node takes its kind, its named style, its own look and its part overrides', () => {
    const node = {
      type: 'rect',
      id: 'a',
      z: 'a0',
      center: { x: 0, y: 0 },
      size: { width: 96, height: 48 },
      class: 'warn',
      style: { hue: 'red', border: false },
      overrides: { title: { text: 'Hello', style: { hue: 'blue' } }, footer: { hidden: true } },
      ports: [{ id: 'out', side: 's', offset: 0.5 }],
      label: 'A',
    };
    const upgraded = upgradeNode(node);
    expect(upgraded).toEqual({
      kind: 'rect',
      id: 'a',
      z: 'a0',
      center: { x: 0, y: 0 },
      size: { width: 96, height: 48 },
      style: 'warn',
      overrides: { color: 'red', stroke: 'none' },
      partOverrides: { title: { label: 'Hello', overrides: { color: 'blue' } }, footer: { hidden: true } },
      ports: [{ id: 'out', x: 0.5, y: 1, side: 'bottom' }],
      label: 'A',
    });
    expect(Schema.decodeUnknownSync(RectNode)(upgraded)).toMatchObject({ kind: 'rect', style: 'warn' });
    expect(upgradeNode(upgraded)).toEqual(upgraded);
  });

  test("a note's text is its label, and a path's exact colour is its own colour", () => {
    expect(upgradeNode({ type: 'note', id: 'n', text: 'Hi' })).toEqual({ kind: 'note', id: 'n', label: 'Hi' });
    expect(upgradeNode({ type: 'path', id: 'p', d: 'M0 0', fill: '#1e90ff', style: { opacity: 0.5 } })).toEqual({
      kind: 'path',
      id: 'p',
      d: 'M0 0',
      overrides: { opacity: 0.5, color: '#1e90ff' },
    });
  });

  test('a link is of the kind `link`, and its path, markers and caption take their current names', () => {
    const link = {
      type: 'spline',
      id: 'l',
      z: 'a1',
      source: { node: 'a' },
      target: { node: 'b', port: 'in' },
      ends: { start: 'diamond', end: 'many' },
      text: 'owns',
      class: 'flow',
      style: { hue: 'teal', lineStyle: 'dotted', fontSize: 10 },
      points: [{ x: 1, y: 2 }],
    };
    const upgraded = upgradeLink(link);
    expect(upgraded).toEqual({
      kind: 'link',
      path: 'spline',
      id: 'l',
      z: 'a1',
      source: { node: 'a' },
      target: { node: 'b', port: 'in' },
      tail: 'diamond',
      head: 'crowsfoot',
      label: 'owns',
      style: 'flow',
      overrides: { color: 'teal', stroke: 'dotted', fontSize: 10 },
      points: [{ x: 1, y: 2 }],
    });
    expect(Schema.decodeUnknownSync(Link, { onExcessProperty: 'error' })(upgraded)).toEqual(upgraded);
    expect(upgradeLink(upgraded)).toEqual(upgraded);
    expect(upgradeNodeOrLink(link)).toEqual(upgraded);
    expect(upgradeNodeOrLink({ type: 'rect', id: 'a' })).toEqual({ kind: 'rect', id: 'a' });
  });

  test('a diagram shape states its outline as a stroke and its component by name', () => {
    expect(upgradeShape({ kind: 'rect', id: 'a', border: false, type: 'card' })).toEqual({
      kind: 'rect',
      id: 'a',
      stroke: 'none',
      component: 'card',
    });
    expect(upgradeShape({ kind: 'grid', id: 'g', border: true, stroke: 'dashed' })).toMatchObject({ stroke: 'dashed' });
    expect(upgradeShape({ kind: 'grid', id: 'g', border: true })).toMatchObject({ stroke: 'solid' });
    // A line has no outline to switch off, so the flag is dropped and its own stroke kept.
    expect(upgradeShape({ kind: 'line', id: 'l', border: false, stroke: 'dotted' })).toEqual({
      kind: 'line',
      id: 'l',
      stroke: 'dotted',
    });
    const current = { kind: 'rect', id: 'a', stroke: 'none', component: 'card' };
    expect(upgradeShape(current)).toEqual(current);
    expect(upgradeNode({ type: 'diagram', id: 'd', element: { kind: 'rect', id: 'a', border: false } })).toEqual({
      kind: 'diagram',
      id: 'd',
      element: { kind: 'rect', id: 'a', stroke: 'none' },
    });
  });

  test('a style class and a constraint take the current words', () => {
    expect(upgradeStyleClass({ id: 'warn', name: 'Warn', style: { hue: 'amber', tone: 3 } })).toEqual({
      id: 'warn',
      name: 'Warn',
      style: { color: 'amber/3' },
    });
    expect(upgradeConstraint({ subject: 'a', relation: 'east', object: 'b' })).toEqual({
      subject: 'a',
      relation: 'right-of',
      object: 'b',
    });
    expect(upgradeConstraint({ subject: 'a', relation: 'aligned', object: 'b' }).relation).toBe('aligned');
  });

  describe('upgrade of stored records', () => {
    test('a node the editor wrote holds its own fields, not a bag of them', () => {
      const stored = {
        id: 'a',
        type: 'rect',
        z: 'a0',
        center: { x: 0, y: 0 },
        size: { width: 96, height: 48 },
        label: 'A',
        style: 'warn',
        overrides: { hue: 'red', tone: 1, border: false },
        props: {
          canvas: {
            ports: [{ id: 'out', side: 'e', offset: 0.5 }],
            padding: { x: 4 },
            overrides: { title: { text: 'T' } },
          },
          other: 1,
        },
      };
      expect(upgradeElement2D(stored)).toEqual({
        id: 'a',
        kind: 'rect',
        z: 'a0',
        center: { x: 0, y: 0 },
        size: { width: 96, height: 48 },
        label: 'A',
        style: 'warn',
        overrides: { color: 'red/1', stroke: 'none' },
        ports: [{ id: 'out', x: 1, y: 0.5, side: 'right' }],
        padding: { x: 4 },
        partOverrides: { title: { label: 'T' } },
        props: { other: 1 },
      });
    });

    test('a placed composite keeps the kind its bag named, and a note its text', () => {
      const card = upgradeElement2D({
        id: 'c',
        object: 'instance:card',
        z: 'a1',
        center: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        props: { canvas: { type: 'card', composite: 'card', data: { title: 'Hi' } } },
      });
      expect(card).toEqual({
        id: 'c',
        object: 'instance:card',
        kind: 'card',
        z: 'a1',
        center: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        composite: 'card',
        data: { title: 'Hi' },
      });
      const note = upgradeElement2D({
        id: 'n',
        type: 'note',
        z: 'a2',
        center: { x: 0, y: 0 },
        size: { width: 96, height: 48 },
        label: 'stale',
        props: { canvas: { text: 'Hello' } },
      });
      expect(note).toMatchObject({ kind: 'note', label: 'Hello' });
      expect(note).not.toHaveProperty('text');
      expect(note).not.toHaveProperty('props');
    });

    test('a link the editor wrote takes its path, markers and free ends from its bag', () => {
      const link = upgradeElement2D({
        id: 'l',
        type: 'link',
        z: 'a3',
        source: { node: 'a', port: 'out' },
        label: 'owns',
        overrides: { hue: 'teal', lineStyle: 'dashed' },
        props: {
          canvas: {
            type: 'ortho',
            ends: { end: 'many' },
            target: { point: { x: 10, y: 20 } },
            style: { fontSize: 10 },
          },
        },
      });
      expect(link).toEqual({
        id: 'l',
        kind: 'link',
        path: 'ortho',
        z: 'a3',
        source: { node: 'a', port: 'out' },
        target: { point: { x: 10, y: 20 } },
        head: 'crowsfoot',
        label: 'owns',
        overrides: { fontSize: 10, color: 'teal', stroke: 'dashed' },
      });
    });

    test('a field the other props hold is not copied out of the bag', () => {
      expect(
        upgradeElement2D({
          id: 'u',
          type: 'solid',
          z: 'a0',
          props: { op: 'union', operands: 'a b', canvas: { op: 'union', operands: 'a', rings: [] } },
        }),
      ).toEqual({ id: 'u', kind: 'solid', z: 'a0', rings: [], props: { op: 'union', operands: 'a b' } });
    });

    test('an element no editor wrote keeps its props, and a current element is returned as it is', () => {
      const solid = { id: 'u', type: 'solid', props: { op: 'union', operands: 'a b' } };
      expect(upgradeElement2D(solid)).toEqual({ id: 'u', kind: 'solid', props: { op: 'union', operands: 'a b' } });
      const current = { id: 'r', kind: 'rect', z: 'a0', overrides: { color: 'blue/2', fill: 'none' } };
      expect(upgradeElement2D(current)).toBe(current);
      expect(upgradeElement3D({ id: 'c', type: 'cube', overrides: { hue: 'sky', surface: 'glass' } })).toEqual({
        id: 'c',
        kind: 'cube',
        overrides: { color: 'sky', fill: 'glass' },
      });
    });

    test('a look no schema takes is dropped rather than hiding its element', () => {
      expect(upgradeElement2D({ id: 'r', type: 'rect', overrides: { hue: 'Not A Colour' } })).toEqual({
        id: 'r',
        kind: 'rect',
      });
    });

    test('a document upgrades its layouts and models, and upgrading again changes nothing', () => {
      // Read as stored data is: what version 0.1.0 wrote is no document by the current types.
      const stored: Scene.SceneDocument = JSON.parse(
        JSON.stringify({
          scenes: [],
          layouts: [
            {
              id: 'main',
              dim: '2d',
              model: 'm',
              elements: { a: { id: 'a', type: 'rect', overrides: { hue: 'red' } } },
              styles: { warn: { hue: 'amber', tone: 3 } },
              constraints: [{ subject: 'a', relation: 'east', object: 'b' }],
            },
            { id: 'space', dim: '3d', elements: { c: { id: 'c', type: 'cube', overrides: { surface: 'tint' } } } },
          ],
          models: [
            {
              id: 'm',
              dim: '2d',
              objects: { box: { id: 'box', type: 'rect', overrides: { rounded: true } } },
              styles: { warn: { name: 'Warn', hue: 'amber' } },
            },
          ],
        }),
      );
      const upgraded = upgradeDocument(stored);
      expect(upgraded.layouts).toEqual([
        {
          id: 'main',
          dim: '2d',
          model: 'm',
          elements: { a: { id: 'a', kind: 'rect', overrides: { color: 'red' } } },
          styles: { warn: { color: 'amber/3' } },
          constraints: [{ subject: 'a', relation: 'right-of', object: 'b' }],
        },
        { id: 'space', dim: '3d', elements: { c: { id: 'c', kind: 'cube', overrides: { fill: 'tint' } } } },
      ]);
      expect(upgraded.models).toEqual([
        {
          id: 'm',
          dim: '2d',
          objects: { box: { id: 'box', kind: 'rect', overrides: { corners: 'all' } } },
          styles: { warn: { name: 'Warn', color: 'amber' } },
        },
      ]);
      expect(upgradeDocument(upgraded)).toEqual(upgraded);
    });

    test('an object the 2D editor stored as a `rect` takes the kind of the container it is', () => {
      const stored: Scene.SceneDocument = {
        scenes: [],
        layouts: [
          {
            id: 'root',
            dim: '2d',
            model: 'm',
            elements: {
              v: { id: 'v', kind: 'view', object: 'view:inner', center: { x: 0, y: 0 } },
              g: { id: 'g', kind: 'instance', object: 'instance:parts', center: { x: 0, y: 0 } },
              h: { id: 'h', kind: 'instance', object: 'instance:border', hull: 'box', center: { x: 0, y: 0 } },
              o: { id: 'o', kind: 'instance', object: 'instance:card', center: { x: 0, y: 0 } },
            },
          },
          { id: 'inner', dim: '2d', elements: {} },
          { id: 'parts', dim: '2d', kind: 'composite', anonymous: true, elements: {} },
          { id: 'border', dim: '2d', kind: 'composite', anonymous: true, elements: {} },
          { id: 'card', dim: '2d', kind: 'composite', elements: {} },
        ],
        models: [
          {
            id: 'm',
            dim: '2d',
            objects: {
              'view:inner': { id: 'view:inner', kind: 'rect', parts: 'inner' },
              'instance:parts': { id: 'instance:parts', kind: 'rect', parts: 'parts' },
              'instance:border': { id: 'instance:border', kind: 'rect', parts: 'border' },
              'instance:card': { id: 'instance:card', kind: 'rect', parts: 'card' },
            },
          },
        ],
      };
      const upgraded = upgradeDocument(stored);
      const kinds = Object.values(upgraded.models[0].objects).map((object) => object.kind);
      expect(kinds).toEqual(['view', 'group', 'hull', 'rect']);
      // Retyped once: a second pass finds nothing to change and returns the document it was given.
      expect(retypeContainers(upgraded)).toBe(upgraded);
    });
  });
});
