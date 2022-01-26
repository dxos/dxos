//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { Vector } from '@dxos/gem-core';

import { ElementData, Ellipse, Line, Path, Rect } from '../../src';

const check = <T extends any>(value: T): T => value;

const ids = [
  faker.datatype.uuid(),
  faker.datatype.uuid(),
  faker.datatype.uuid(),
  faker.datatype.uuid()
];

export const generator = (): ElementData<any>[] => [
  {
    id: ids[0],
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: -2, y: -1, width: 4, height: 2 }),
      text: 'ECHO',
      style: 'style-1'
    })
  },
  {
    id: ids[1],
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: -10, y: -1, width: 4, height: 2 }),
      text: 'MESH',
      style: 'style-2'
    })
  },
  {
    id: ids[2],
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: 6, y: -1, width: 4, height: 2 }),
      text: 'HALO',
      style: 'style-3'
    })
  },
  {
    id: ids[3],
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: -2, y: 3, width: 4, height: 2 }),
      text: 'DXOS'
    })
  },

  {
    id: faker.datatype.uuid(),
    type: 'line',
    data: check<Line>({
      source: {
        id: ids[0],
        handle: 'w'
      },
      target: {
        id: ids[1],
        handle: 'e'
      }
    })
  },

  /*
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: check<Ellipse>({
      center: Vector.toVertex({ x: 0, y: -4 }), rx: [1, 1], ry: [1, 1]
    })
  },

  {
    id: faker.datatype.uuid(),
    type: 'path',
    data: check<Path>({
      points: [
        Vector.toVertex({ x: -18, y: 2 }),
        Vector.toVertex({ x: -16, y: 4 }),
        Vector.toVertex({ x: -14, y: -2 }),
        Vector.toVertex({ x: -15, y: -3 }),
        Vector.toVertex({ x: -17, y: -1 }),
      ],
      curve: 'cardinal',
      closed: true
    })
  }
  */
];
