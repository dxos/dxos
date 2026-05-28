//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { linkRadial } from 'd3';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

const meta: Meta = {
  title: 'ui/react-ui-graph/experimental',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj;

// ---------------------------------------------------------------------------
// PathProbe — renders a fixed set of example bezier paths the cluster layout
// might emit, side-by-side across five columns:
//   1. Baked path strings (cubic / quadratic) as the cluster projector once
//      emitted them.
//   2. linkRadial output from polar coordinates — should match column 1.
//   3. radialQuadratic — Q with control at (target.angle, source.radius).
//   4. radialElbow — sharp 2-segment elbow through the same knee.
//   5. radialSmoothElbow — cubic with both controls at the knee.
//
// Kept around so future curve experiments can compare candidate generators
// at a glance without touching the production cluster projector.
// ---------------------------------------------------------------------------

const PROBE_PATHS = [
  // Source group at M(-174.87, -44.729). All three paths share that origin.
  {
    label: 'good (target angle 5.19, clockwise)',
    color: 'lime',
    d: 'M-174.87,-44.729 C-262.305,-67.094, -240.395,-124.563, -320.527,-166.083',
    target: [-320.527, -166.083] as [number, number],
  },
  {
    label: 'good (target angle 5.55, clockwise)',
    color: 'cyan',
    d: 'M-174.87,-44.729 C-262.305,-67.094, -180.249,-202.029, -240.332,-269.372',
    target: [-240.332, -269.372] as [number, number],
  },
  {
    label: 'bad (target angle 4.28, counter-clockwise)',
    color: 'orange',
    d: 'M-174.87,-44.729 C-262.305,-67.094, -245.815,113.492, -327.754,151.323',
    target: [-327.754, 151.323] as [number, number],
  },
  // Live path the user reports as not rendering correctly in the full cluster.
  // Source polar ≈ (1.14, 190.5); target polar ≈ (1.82, 380.9). Clockwise direction.
  {
    label: 'live broken (clockwise, source.x=1.14 → target.x=1.82)',
    color: 'magenta',
    d: 'M172.95585588832455,-79.85312713937451Q184.55815606041466,47.20738323164743 369.1163121208293,94.41476646329485',
    target: [369.1163121208293, 94.41476646329485] as [number, number],
  },
];

const SOURCE_XY: [number, number] = [-174.87, -44.729];

// Reverse-engineered polar coords from the user's reported path strings.
// Source group: polar (4.96 rad, 181) → cartesian (-174.87, -44.729).
// We use linkRadial here directly to verify the strings d3 produces match what we expect.
const SOURCE_POLAR = { x: 4.96, y: 181 } as { x: number; y: number };
const PROBE_POLAR_TARGETS = [
  { label: 'target 5.19 (clockwise)', color: 'lime', polar: { x: 5.19, y: 360 } },
  { label: 'target 5.55 (clockwise)', color: 'cyan', polar: { x: 5.55, y: 361 } },
  { label: 'target 4.28 (counter-clockwise)', color: 'orange', polar: { x: 4.28, y: 361 } },
];

/** Convert d3-cluster polar (angle from 12 o'clock, sweeping clockwise) to cartesian. */
const polarToCartesian = (angle: number, radius: number): [number, number] => [
  Math.cos(angle - Math.PI / 2) * radius,
  Math.sin(angle - Math.PI / 2) * radius,
];

/**
 * Alternative curve: quadratic bezier from source to target with a single control point at
 * (target.angle, source.radius). This makes the curve emerge from source heading TOWARD
 * the target's angular direction (vs. linkRadial's curveBumpPolar, which emerges along
 * source's angle and may bow far away from the target on the way).
 */
const radialQuadratic = (source: { x: number; y: number }, target: { x: number; y: number }) => {
  const [sx, sy] = polarToCartesian(source.x, source.y);
  const [tx, ty] = polarToCartesian(target.x, target.y);
  const [cx, cy] = polarToCartesian(target.x, source.y);
  return `M${sx},${sy}Q${cx},${cy} ${tx},${ty}`;
};

/** Sharp elbow: M source L (target.angle, source.radius) L target. Hard-corner radial elbow. */
const radialElbow = (source: { x: number; y: number }, target: { x: number; y: number }) => {
  const [sx, sy] = polarToCartesian(source.x, source.y);
  const [tx, ty] = polarToCartesian(target.x, target.y);
  const [cx, cy] = polarToCartesian(target.x, source.y);
  return `M${sx},${sy}L${cx},${cy}L${tx},${ty}`;
};

/**
 * Smoothed radial elbow: cubic bezier whose control points sit at the elbow knee. Curve
 * emerges from source TOWARD the target angle (around the source ring), then bends OUT to
 * target's radius. Eliminates the wide-ear from linkRadial AND the missing-stub from the
 * pure quadratic — both halves of the curve are visible and follow the radial layout.
 */
const radialSmoothElbow = (source: { x: number; y: number }, target: { x: number; y: number }) => {
  const [sx, sy] = polarToCartesian(source.x, source.y);
  const [tx, ty] = polarToCartesian(target.x, target.y);
  const [kx, ky] = polarToCartesian(target.x, source.y); // "knee" — at source radius, target angle
  // Both control points near the knee so the curve hugs the elbow.
  return `M${sx},${sy}C${kx},${ky} ${kx},${ky} ${tx},${ty}`;
};

const PathProbe = () => {
  const radialLink = linkRadial<any, any>()
    .angle((d) => d.x)
    .radius((d) => d.y);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0c0c0c', position: 'relative' }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='100%'
        height='100%'
        viewBox='-450 -350 4000 700'
        style={{ display: 'block' }}
      >
        {/* Center reference (column 1: baked paths) */}
        <line x1={-450} y1={0} x2={450} y2={0} stroke='#222' />
        <line x1={0} y1={-350} x2={0} y2={350} stroke='#222' />

        {/* Origin marker */}
        <circle cx={0} cy={0} r={3} fill='#444' />
        <text x={-440} y={-330} fill='#666' fontSize={11}>
          baked path strings (left)
        </text>

        {/* Source group circle */}
        <circle cx={SOURCE_XY[0]} cy={SOURCE_XY[1]} r={5} fill='#888' />

        {/* Pre-baked path strings (left column visualization). Handles both cubic (C) and
            quadratic (Q) bezier commands. */}
        {PROBE_PATHS.map((p, i) => {
          const cubic = p.d.match(
            /M\s*([-\d.]+),\s*([-\d.]+)\s*C\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/,
          );
          const quad = p.d.match(/M\s*([-\d.]+),\s*([-\d.]+)\s*Q\s*([-\d.]+),\s*([-\d.]+)\s+([-\d.]+),\s*([-\d.]+)/);
          const controls: Array<[number, number]> = [];
          let mx = 0,
            my = 0,
            ex = 0,
            ey = 0;
          if (cubic) {
            const v = cubic.map(parseFloat);
            mx = v[1];
            my = v[2];
            controls.push([v[3], v[4]], [v[5], v[6]]);
            ex = v[7];
            ey = v[8];
          } else if (quad) {
            const v = quad.map(parseFloat);
            mx = v[1];
            my = v[2];
            controls.push([v[3], v[4]]);
            ex = v[5];
            ey = v[6];
          }
          return (
            <g key={`baked-${i}`}>
              <path d={p.d} fill='none' stroke={p.color} strokeWidth={2} />
              <polyline
                points={[`${mx},${my}`, ...controls.map(([x, y]) => `${x},${y}`), `${ex},${ey}`].join(' ')}
                fill='none'
                stroke={p.color}
                strokeOpacity={0.3}
                strokeWidth={1}
                strokeDasharray='2 3'
              />
              {controls.map(([x, y], j) => (
                <circle key={j} cx={x} cy={y} r={3} fill={p.color} opacity={0.5} />
              ))}
              <circle cx={p.target[0]} cy={p.target[1]} r={5} fill={p.color} />
              <text x={p.target[0] + 8} y={p.target[1]} fill={p.color} fontSize={11}>
                {p.label}
              </text>
            </g>
          );
        })}

        {/* Re-generate the same paths via linkRadial from polar coords. Shift right by 700 so they
            sit in a second column for direct visual comparison. */}
        <g transform='translate(750, 0)'>
          <line x1={-450} y1={0} x2={450} y2={0} stroke='#222' />
          <line x1={0} y1={-350} x2={0} y2={350} stroke='#222' />
          <circle cx={0} cy={0} r={3} fill='#444' />
          <circle cx={SOURCE_XY[0]} cy={SOURCE_XY[1]} r={5} fill='#888' />
          <text x={-440} y={-330} fill='#666' fontSize={11}>
            linkRadial output from polar (middle)
          </text>
          {PROBE_POLAR_TARGETS.map((p, i) => {
            const d = radialLink({ source: SOURCE_POLAR, target: p.polar }) ?? '';
            const m = d.match(
              /M\s*([-\d.]+),\s*([-\d.]+)\s*C\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/,
            );
            if (!m) {
              return null;
            }
            const [, , , c1x, c1y, c2x, c2y, ex, ey] = m.map(parseFloat);
            return (
              <g key={`fresh-${i}`}>
                <path d={d} fill='none' stroke={p.color} strokeWidth={2} />
                <circle cx={c1x} cy={c1y} r={3} fill={p.color} opacity={0.5} />
                <circle cx={c2x} cy={c2y} r={3} fill={p.color} opacity={0.5} />
                <circle cx={ex} cy={ey} r={5} fill={p.color} />
                <text x={ex + 8} y={ey} fill={p.color} fontSize={11}>
                  {p.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* Alternative A: quadratic with control at (target.angle, source.radius). */}
        <g transform='translate(1500, 0)'>
          <line x1={-450} y1={0} x2={450} y2={0} stroke='#222' />
          <line x1={0} y1={-350} x2={0} y2={350} stroke='#222' />
          <circle cx={0} cy={0} r={3} fill='#444' />
          <circle cx={SOURCE_XY[0]} cy={SOURCE_XY[1]} r={5} fill='#888' />
          <text x={-440} y={-330} fill='#666' fontSize={11}>
            radialQuadratic — control at (target.angle, source.radius)
          </text>
          {PROBE_POLAR_TARGETS.map((p, i) => {
            const d = radialQuadratic(SOURCE_POLAR, p.polar);
            const [tx, ty] = polarToCartesian(p.polar.x, p.polar.y);
            const [cx, cy] = polarToCartesian(p.polar.x, SOURCE_POLAR.y);
            return (
              <g key={`alt-${i}`}>
                <path d={d} fill='none' stroke={p.color} strokeWidth={2} />
                <circle cx={cx} cy={cy} r={3} fill={p.color} opacity={0.5} />
                <circle cx={tx} cy={ty} r={5} fill={p.color} />
                <text x={tx + 8} y={ty} fill={p.color} fontSize={11}>
                  {p.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* Alternative B: sharp elbow — two line segments. */}
        <g transform='translate(2250, 0)'>
          <line x1={-450} y1={0} x2={450} y2={0} stroke='#222' />
          <line x1={0} y1={-350} x2={0} y2={350} stroke='#222' />
          <circle cx={0} cy={0} r={3} fill='#444' />
          <circle cx={SOURCE_XY[0]} cy={SOURCE_XY[1]} r={5} fill='#888' />
          <text x={-440} y={-330} fill='#666' fontSize={11}>
            radialElbow — sharp 2-segment elbow
          </text>
          {PROBE_POLAR_TARGETS.map((p, i) => {
            const d = radialElbow(SOURCE_POLAR, p.polar);
            const [tx, ty] = polarToCartesian(p.polar.x, p.polar.y);
            return (
              <g key={`elbow-${i}`}>
                <path d={d} fill='none' stroke={p.color} strokeWidth={2} />
                <circle cx={tx} cy={ty} r={5} fill={p.color} />
                <text x={tx + 8} y={ty} fill={p.color} fontSize={11}>
                  {p.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* Alternative C: smoothed elbow — cubic with both controls at the knee. */}
        <g transform='translate(3000, 0)'>
          <line x1={-450} y1={0} x2={450} y2={0} stroke='#222' />
          <line x1={0} y1={-350} x2={0} y2={350} stroke='#222' />
          <circle cx={0} cy={0} r={3} fill='#444' />
          <circle cx={SOURCE_XY[0]} cy={SOURCE_XY[1]} r={5} fill='#888' />
          <text x={-440} y={-330} fill='#666' fontSize={11}>
            radialSmoothElbow — cubic with both controls at the knee
          </text>
          {PROBE_POLAR_TARGETS.map((p, i) => {
            const d = radialSmoothElbow(SOURCE_POLAR, p.polar);
            const [tx, ty] = polarToCartesian(p.polar.x, p.polar.y);
            return (
              <g key={`smooth-${i}`}>
                <path d={d} fill='none' stroke={p.color} strokeWidth={2} />
                <circle cx={tx} cy={ty} r={5} fill={p.color} />
                <text x={tx + 8} y={ty} fill={p.color} fontSize={11}>
                  {p.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export const PathProbeStory: Story = {
  name: 'PathProbe',
  render: () => <PathProbe />,
};

// ---------------------------------------------------------------------------
// PathInspector — paste any `d` string, click Diagnose. The path is rendered
// in an SVG and the same diagnostics (bbox, pathLength, computed CSS) we'd
// otherwise pull from the console are printed alongside. Loops to avoid the
// console-snippet ping-pong when debugging "this path doesn't render."
// ---------------------------------------------------------------------------

const PathInspector = () => {
  const [input, setInput] = React.useState(
    'M172.95585588832455,-79.85312713937451Q184.55815606041466,47.20738323164743 369.1163121208293,94.41476646329485',
  );
  const [info, setInfo] = React.useState<Record<string, unknown> | null>(null);
  const pathRef = React.useRef<SVGPathElement | null>(null);

  const diagnose = React.useCallback(() => {
    const el = pathRef.current;
    if (!el) {
      setInfo({ error: 'no path element' });
      return;
    }
    const cs = getComputedStyle(el);
    let bbox: any = null;
    try {
      const b = el.getBBox();
      bbox = { x: b.x, y: b.y, width: b.width, height: b.height };
    } catch (e: any) {
      bbox = `error: ${e?.message}`;
    }
    let len: number | string = 0;
    try {
      len = el.getTotalLength();
    } catch (e: any) {
      len = `error: ${e?.message}`;
    }
    setInfo({
      d: el.getAttribute('d'),
      bbox,
      pathLength: len,
      stroke: cs.stroke,
      strokeWidth: cs.strokeWidth,
      strokeOpacity: cs.strokeOpacity,
      opacity: cs.opacity,
      visibility: cs.visibility,
      display: cs.display,
      clipPath: cs.clipPath,
      transform: cs.transform,
    });
  }, []);

  // Run on mount.
  React.useEffect(() => {
    diagnose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0c0c0c',
        color: '#ddd',
        fontFamily: 'monospace',
        padding: 12,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          style={{
            flex: 1,
            background: '#111',
            color: '#ddd',
            border: '1px solid #333',
            padding: 6,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
          placeholder='paste a `d` attribute string (M ... C/Q ...)'
        />
        <button
          onClick={diagnose}
          style={{
            background: '#222',
            color: '#ddd',
            border: '1px solid #444',
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          Diagnose
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1, minHeight: 0 }}>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='100%'
          height='100%'
          viewBox='-450 -350 900 700'
          style={{ background: '#000', border: '1px solid #222' }}
        >
          <line x1={-450} y1={0} x2={450} y2={0} stroke='#222' />
          <line x1={0} y1={-350} x2={0} y2={350} stroke='#222' />
          <circle cx={0} cy={0} r={3} fill='#444' />
          <path ref={pathRef} d={input} fill='none' stroke='magenta' strokeWidth={2} />
        </svg>

        <pre
          style={{
            background: '#111',
            padding: 10,
            overflow: 'auto',
            fontSize: 12,
            margin: 0,
            border: '1px solid #222',
          }}
        >
          {info ? JSON.stringify(info, null, 2) : '(click Diagnose)'}
        </pre>
      </div>
    </div>
  );
};

export const PathInspectorStory: Story = {
  name: 'PathInspector',
  render: () => <PathInspector />,
};
