//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { Vector } from '@dxos/gem-x';

import { ElementData, Ellipse, Line, Path, Rect } from '../../src';

const check = <T extends any>(value: T): T => value;

const ids = [
  faker.datatype.uuid(),
  faker.datatype.uuid(),
  faker.datatype.uuid(),
  faker.datatype.uuid()
];

// TODO(burdon): Generate from graph.

export const generator = (): ElementData<any>[] => [
  {
    id: ids[0],
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: -2, y: -1, width: 4, height: 2 }),
      text: 'DXOS'
    })
  },
  {
    id: ids[1],
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: -8, y: -1, width: 4, height: 2 }),
      text: 'MESH'
    })
  },
  {
    id: ids[2],
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: 4, y: -1, width: 4, height: 2 }),
      text: 'HALO'
    })
  },
  {
    id: ids[3],
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: -2, y: 3, width: 4, height: 2 }),
      text: 'ECHO'
    })
  },

  /*
  {
    id: faker.datatype.uuid(),
    type: 'line',
    data: check<Line>({
      source: {
        id: ids[0]
      },
      target: {
        id: ids[1]
      }
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'line',
    data: check<Line>({
      source: {
        id: ids[0]
      },
      pos2: { x: [-7, 1], y: [-3, 1] }
    })
  },
  */

  /*
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: check<Ellipse>({
      center: Vector.toVertex({ x: 2, y: 3 }), rx: [1, 1], ry: [1, 1]
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: check<Ellipse>({
      center: Vector.toVertex({ x: 6, y: 5 }), rx: [1, 2], ry: [1, 2],
      text: 'A'
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: check<Ellipse>({
      center: Vector.toVertex({ x: 10, y: -2 }), rx: [1, 2], ry: [1, 2],
      text: 'B'
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: check<Ellipse>({
      center: Vector.toVertex({ x: -1, y: 3 }), rx: [1, 2], ry: [1, 2],
      text: 'C'
    })
  },

  {
    id: faker.datatype.uuid(),
    type: 'line',
    data: check<Line>({
      pos1: Vector.toVertex({ x: 2, y: 3 }), pos2: Vector.toVertex({ x: 6, y: 5 })
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'line',
    data: check<Line>({
      pos1: Vector.toVertex({ x: 2, y: 3 }), pos2: Vector.toVertex({ x: 10, y: -2 })
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'line',
    data: check<Line>({
      pos1: Vector.toVertex({ x: 2, y: 3 }), pos2: Vector.toVertex({ x: -1, y: 3 })
    })
  },

  {
    id: faker.datatype.uuid(),
    type: 'path',
    data: check<Path>({
      points: [
        Vector.toVertex({ x: -8, y: 8 }),
        Vector.toVertex({ x: -6, y: 10 }),
        Vector.toVertex({ x: -4, y: 4 }),
        Vector.toVertex({ x: -5, y: 3 }),
        Vector.toVertex({ x: -7, y: 5 }),
      ],
      curve: 'cardinal',
      closed: true
    })
  }
  */
];
