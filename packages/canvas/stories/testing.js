//
// Copyright 2020 Wireline, Inc.
//

export const data = [
  {
    type: 'ellipse',
    order: 3,
    bounds: { x: -40, y: -10, width: 20, height: 20 }
  },
  {
    type: 'rect',
    order: 3,
    bounds: { x: 20, y: -10, width: 20, height: 20 }
  },
  {
    type: 'path',
    order: 2,
    bounds: { x: -20, y: 0 },
    points: [{ x: 0, y: 0 }, { x: 40, y: 0 }]
  },
  {
    type: 'path',
    order: 2,
    bounds: { x: -30, y: 0 },
    points: [{ x: 0, y: -10 }, { x: 0, y: -20 }, { x: 60, y: -20 }, { x: 60, y: -10 }]
  },
  {
    type: 'text',
    order: 1,
    bounds: { x: -40, y: -5, width: 20, height: 10 },
    text: 'A'
  },
  {
    type: 'text',
    order: 1,
    bounds: { x: 20, y: -5, width: 20, height: 10 },
    text: 'B'
  },
  {
    type: 'text',
    order: 1,
    bounds: { x: -20, y: 0, width: 40, height: 10 },
    text: 'Canvas'
  },
];
