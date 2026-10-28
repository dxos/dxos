//
// Copyright 2026 DXOS.org
//

//
// A stage over a minimal object, for stories and tests: dots on a plane, each with an animatable position, scale,
// opacity and colour, and a ring layout for scripts. It proves the Stage contract without any other plugin.
//

import * as Schema from 'effect/Schema';
import React, { useEffect } from 'react';

import { type Arranger } from '@dxos/animation';
import { DXN, Obj, Type } from '@dxos/echo';

import { type AnimatorCapabilities } from '#types';

export const Dot = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  color: Schema.String,
});
export type Dot = Schema.Schema.Type<typeof Dot>;

export class Dots extends Type.makeObject<Dots>(DXN.make('org.dxos.type.animator.testing.dots', '0.1.0'))(
  Schema.Struct({ dots: Schema.Array(Dot) }),
) {}

export const makeDots = (dots: readonly Dot[]): Dots => Obj.make(Dots, { dots: [...dots] });

const PROPERTIES: AnimatorCapabilities.AnimatableProperty[] = [
  { path: 'position', kind: 'point' },
  { path: 'scale', kind: 'number' },
  { path: 'opacity', kind: 'number' },
  { path: 'color', kind: 'color' },
];

/** Places targets evenly on a circle (`radius`, default 30) about the origin. */
const ring: Arranger = ({ targets, params }) => {
  const radius = typeof params.radius === 'number' ? params.radius : 30;
  return Object.fromEntries(
    targets.map((target, index) => {
      const angle = (index / targets.length) * Math.PI * 2 - Math.PI / 2;
      return [target, { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius) }];
    }),
  );
};

const dotsOf = (stage: Obj.Unknown): readonly Dot[] => (Obj.instanceOf(Dots, stage) ? stage.dots : []);

const numberOr = (value: unknown, fallback: number): number => (typeof value === 'number' ? value : fallback);

const pointOr = (value: unknown, fallback: { x: number; y: number }): { x: number; y: number } =>
  typeof value === 'object' && value !== null && 'x' in value && 'y' in value
    ? { x: numberOr(value.x, fallback.x), y: numberOr(value.y, fallback.y) }
    : fallback;

/** Draws the dots with the sample applied: a view of the object, which is never written. */
export const DotsStageComponent = ({ stage, sample, onFrameDrawn }: AnimatorCapabilities.StageProps) => {
  useEffect(() => onFrameDrawn?.(sample.t), [sample.t, onFrameDrawn]);
  const zoom = numberOr(sample.camera?.zoom, 1);
  const centre = { x: numberOr(sample.camera?.x, 0), y: numberOr(sample.camera?.y, 0) };
  const half = 50 / zoom;
  return (
    <svg
      className='dx-fill'
      viewBox={`${centre.x - half} ${centre.y - half} ${half * 2} ${half * 2}`}
      data-testid='dots.stage'
      data-frame-time={sample.t.toFixed(4)}
    >
      {dotsOf(stage).map((dot) => {
        const values = sample.values[dot.id] ?? {};
        const position = pointOr(values.position, dot);
        return (
          <circle
            key={dot.id}
            data-testid={`dots.${dot.id}`}
            cx={position.x}
            cy={position.y}
            r={6 * numberOr(values.scale, 1)}
            opacity={numberOr(values.opacity, 1)}
            fill={typeof values.color === 'string' ? values.color : dot.color}
          />
        );
      })}
    </svg>
  );
};

export const dotsStage: AnimatorCapabilities.StageDef = {
  typename: Type.getTypename(Dots),
  label: 'Dots',
  targets: (stage) =>
    dotsOf(stage).map((dot) => ({
      id: dot.id,
      label: dot.label,
      properties: PROPERTIES,
      values: { position: { x: dot.x, y: dot.y }, scale: 1, opacity: 1, color: dot.color },
    })),
  camera: { kind: '2d', values: () => ({ x: 0, y: 0, zoom: 1 }) },
  renderers: ['2d', 'overlay'],
  layouts: { ring },
  component: DotsStageComponent,
};
