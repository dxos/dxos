//
// Copyright 2026 DXOS.org
//

//
// A stage over a minimal object, for stories and tests: dots on a plane, each with an animatable position, scale,
// opacity and colour, and a ring layout for scripts. It proves the Stage contract without any other plugin.
//

import * as Schema from 'effect/Schema';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

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

export const DotLink = Schema.Struct({ id: Schema.String, from: Schema.String, to: Schema.String });
export type DotLink = Schema.Schema.Type<typeof DotLink>;

export class Dots extends Type.makeObject<Dots>(DXN.make('org.dxos.type.animator.testing.dots', '0.1.0'))(
  Schema.Struct({ dots: Schema.Array(Dot), links: Schema.optional(Schema.Array(DotLink)) }),
) {}

export const makeDots = (dots: readonly Dot[], links: readonly DotLink[] = []): Dots =>
  Obj.make(Dots, { dots: [...dots], links: [...links] });

/** The radius of a dot at scale 1, in stage units. */
const DOT_RADIUS = 6;
/** Half the side of the square the camera shows at zoom 1, in stage units. */
const HALF_VIEW = 50;

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

const linksOf = (stage: Obj.Unknown): readonly DotLink[] => (Obj.instanceOf(Dots, stage) ? (stage.links ?? []) : []);

const numberOr = (value: unknown, fallback: number): number => (typeof value === 'number' ? value : fallback);

const pointOr = (value: unknown, fallback: { x: number; y: number }): { x: number; y: number } =>
  typeof value === 'object' && value !== null && 'x' in value && 'y' in value
    ? { x: numberOr(value.x, fallback.x), y: numberOr(value.y, fallback.y) }
    : fallback;

/** The dots and links at a sample, in stage units, for effects to bind to. */
const bindDots = (stage: Obj.Unknown, sample: AnimatorCapabilities.Sample): AnimatorCapabilities.StageBinding => {
  const objects: Record<string, AnimatorCapabilities.BoundObject> = {};
  for (const dot of dotsOf(stage)) {
    const values = sample.values[dot.id] ?? {};
    const position = pointOr(values.position, dot);
    objects[dot.id] = {
      id: dot.id,
      position: { x: position.x, y: position.y, z: 0 },
      radius: DOT_RADIUS * numberOr(values.scale, 1),
      color: typeof values.color === 'string' ? values.color : dot.color,
      opacity: numberOr(values.opacity, 1),
    };
  }
  const links = linksOf(stage).flatMap((link) => {
    const from = objects[link.from];
    const to = objects[link.to];
    return from && to ? [{ id: link.id, from: link.from, to: link.to, points: [from.position, to.position] }] : [];
  });
  return { objects, links };
};

/** The camera's view box: a square about its centre, `HALF_VIEW / zoom` to each side. */
const viewOf = (sample: AnimatorCapabilities.Sample) => {
  const zoom = numberOr(sample.camera?.zoom, 1);
  return { x: numberOr(sample.camera?.x, 0), y: numberOr(sample.camera?.y, 0), half: HALF_VIEW / zoom };
};

/**
 * Draws the dots with the sample applied (a view of the object, which is never written), the `2d` effect frames over
 * them, and reports where each dot is on screen for the overlay layer.
 */
export const DotsStageComponent = ({
  stage,
  sample,
  effects,
  onFrameDrawn,
  onProjection,
}: AnimatorCapabilities.StageProps) => {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const view = viewOf(sample);
  const binding = useMemo(() => bindDots(stage, sample), [stage, sample]);
  useEffect(() => onFrameDrawn?.(sample.t), [sample.t, onFrameDrawn]);
  useEffect(() => {
    if (!onProjection || size.width === 0) {
      return;
    }
    // The view box is fitted into the element, centred, by its shorter side (`xMidYMid meet`).
    const scale = Math.min(size.width, size.height) / (view.half * 2);
    const anchors = Object.fromEntries(
      Object.values(binding.objects).map((object) => [
        object.id,
        {
          x: size.width / 2 + (object.position.x - view.x) * scale,
          y: size.height / 2 + (object.position.y - view.y) * scale,
          radius: object.radius * scale,
        },
      ]),
    );
    onProjection({ t: sample.t, anchors });
  }, [onProjection, binding, size, view.x, view.y, view.half, sample.t]);

  const shapes = effects.flatMap((frame) => (frame.renderer === '2d' ? frame.items : []));
  return (
    <svg
      ref={ref}
      className='dx-fill'
      viewBox={`${view.x - view.half} ${view.y - view.half} ${view.half * 2} ${view.half * 2}`}
      data-testid='dots.stage'
      data-frame-time={sample.t.toFixed(4)}
    >
      {linksOf(stage).map((link) => {
        const from = binding.objects[link.from];
        const to = binding.objects[link.to];
        return from && to ? (
          <line
            key={link.id}
            x1={from.position.x}
            y1={from.position.y}
            x2={to.position.x}
            y2={to.position.y}
            stroke='currentColor'
            strokeOpacity={0.25 * Math.min(from.opacity, to.opacity)}
            strokeWidth={0.5}
          />
        ) : null;
      })}
      {Object.values(binding.objects).map((object) => (
        <circle
          key={object.id}
          data-testid={`dots.${object.id}`}
          cx={object.position.x}
          cy={object.position.y}
          r={object.radius}
          opacity={object.opacity}
          fill={object.color}
        />
      ))}
      <g data-testid='dots.effects'>
        {shapes.map((shape, index) =>
          shape.kind === 'circle' ? (
            <circle
              key={index}
              cx={shape.center.x}
              cy={shape.center.y}
              r={shape.radius}
              opacity={shape.opacity}
              fill={shape.color ?? 'currentColor'}
            />
          ) : shape.kind === 'rect' ? (
            <rect
              key={index}
              {...shape.bounds}
              rx={shape.radius}
              opacity={shape.opacity}
              fill={shape.color ?? 'currentColor'}
            />
          ) : (
            <path
              key={index}
              d={shape.d}
              fill='none'
              stroke={shape.color ?? shape.stroke ?? 'currentColor'}
              strokeWidth={shape.width ?? 1}
              opacity={shape.opacity}
            />
          ),
        )}
      </g>
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
  bind: bindDots,
  component: DotsStageComponent,
};
