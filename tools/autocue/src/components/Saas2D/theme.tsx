//
// Copyright 2026 DXOS.org
//

// neu-dark: the dark neumorphic surface from the DXOS design kit. Bodies are raised soft containers with an inset
// well; nodes are lit discs glowing in their role colors; links are thin and turn accent when hot; apps are raised
// chips. Everything but the cards is one SVG layer with whole-pixel groups, so shapes and text move only as wholes.

import React, { type ReactNode } from 'react';
import { AbsoluteFill, staticFile } from 'remotion';

import { type Camera, type CardPrim, type Prim } from './engine.ts';
import { FONTS, PALETTE, type Role, ROLES, neuTokens } from './tokens.ts';

export const neu = neuTokens('dark');

export const WIDTH = 1920;
export const HEIGHT = 1080;

/**
 * Shadows for large video shapes on the dark surface: the highlight is a faint cool rim (a large soft highlight reads as
 * grey haze on dark), the lowlight deep and wide.
 */
const HI = 'hsl(220 12% 34% / 0.22)';
const LO = 'hsl(220 30% 2% / 0.78)';

const ROLE_IDS: Role[] = ['team', 'data', 'lab', 'agent'];

const px = Math.round;

/** The camera for screen-space primitives: world units are screen pixels from the top-left. */
const SCREEN: Camera = { x: WIDTH / 2, y: HEIGHT / 2, zoom: 1 };

/** A surface tinted toward a color. */
const tint = (color: string | undefined, amount: number, base: string = neu.lighter) =>
  color ? `color-mix(in oklab, ${base} ${100 - amount}%, ${color})` : base;

/** World to screen pixels, with the origin at the frame's top-left. */
export const project = (camera: Camera, x: number, y: number): [number, number] => [
  (x - camera.x) * camera.zoom + WIDTH / 2,
  (y - camera.y) * camera.zoom + HEIGHT / 2,
];

const At = ({ x, y, opacity = 1, children }: { x: number; y: number; opacity?: number; children: ReactNode }) => (
  <g transform={`translate(${px(x)} ${px(y)})`} opacity={opacity}>
    {children}
  </g>
);

const measure = (() => {
  const cache = new Map<string, number>();
  let context: CanvasRenderingContext2D | null | undefined;
  return (value: string, size: number, weight: number, family: string = FONTS.sans) => {
    const id = `${family} ${weight} ${size} ${value}`;
    const known = cache.get(id);
    if (known !== undefined) {
      return known;
    }
    context ??= typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    if (context) {
      context.font = `${weight} ${size}px ${family}`;
    }
    const width = context ? context.measureText(value).width : value.length * size * 0.56;
    cache.set(id, width);
    return width;
  };
})();

const Text = ({
  x = 0,
  y = 0,
  size,
  weight = 500,
  fill = neu.fg,
  anchor = 'middle',
  mono,
  halo,
  children,
}: {
  x?: number;
  y?: number;
  size: number;
  weight?: number;
  fill?: string;
  anchor?: 'start' | 'middle' | 'end';
  mono?: boolean;
  halo?: boolean;
  children: string;
}) => (
  <text
    x={x}
    y={y}
    textAnchor={anchor}
    dominantBaseline='central'
    fontFamily={mono ? FONTS.mono : FONTS.sans}
    fontSize={size}
    fontWeight={weight}
    fill={fill}
    letterSpacing={mono ? '0.02em' : '-0.01em'}
    style={{ whiteSpace: 'pre' }}
    {...(halo
      ? {
          stroke: neu.darker,
          strokeWidth: size * 0.22,
          strokeOpacity: 0.85,
          strokeLinejoin: 'round',
          paintOrder: 'stroke',
        }
      : {})}
  >
    {children}
  </text>
);

/**
 * Raised and inset shadows; shape filters are in bounding-box units so they scale with the shape (deeper for larger
 * bodies), the chip filter in pixels, since chips are wide and short.
 */
export const Defs = () => (
  <defs>
    <filter id='nd-raised' x='-0.5' y='-0.5' width='2' height='2' primitiveUnits='objectBoundingBox'>
      <feGaussianBlur in='SourceAlpha' stdDeviation='0.05' />
      <feOffset dx='0.028' dy='0.028' result='lo-blur' />
      <feFlood floodColor={LO} />
      <feComposite in2='lo-blur' operator='in' result='lo' />
      <feGaussianBlur in='SourceAlpha' stdDeviation='0.028' />
      <feOffset dx='-0.017' dy='-0.017' result='hi-blur' />
      <feFlood floodColor={HI} />
      <feComposite in2='hi-blur' operator='in' result='hi' />
      <feMerge>
        <feMergeNode in='hi' />
        <feMergeNode in='lo' />
        <feMergeNode in='SourceGraphic' />
      </feMerge>
    </filter>
    <filter id='nd-inset' x='0' y='0' width='1' height='1' primitiveUnits='objectBoundingBox'>
      <feGaussianBlur in='SourceAlpha' stdDeviation='0.03' />
      <feOffset dx='0.022' dy='0.022' result='lo-blur' />
      <feComposite in='SourceAlpha' in2='lo-blur' operator='out' result='lo-edge' />
      <feFlood floodColor={LO} />
      <feComposite in2='lo-edge' operator='in' result='lo' />
      <feGaussianBlur in='SourceAlpha' stdDeviation='0.02' />
      <feOffset dx='-0.013' dy='-0.013' result='hi-blur' />
      <feComposite in='SourceAlpha' in2='hi-blur' operator='out' result='hi-edge' />
      <feFlood floodColor={HI} />
      <feComposite in2='hi-edge' operator='in' result='hi' />
      <feMerge>
        <feMergeNode in='SourceGraphic' />
        <feMergeNode in='lo' />
        <feMergeNode in='hi' />
      </feMerge>
    </filter>
    <filter id='nd-chip' x='-30%' y='-80%' width='160%' height='260%'>
      <feGaussianBlur in='SourceAlpha' stdDeviation='7' />
      <feOffset dx='4.5' dy='4.5' result='lo-blur' />
      <feFlood floodColor={LO} />
      <feComposite in2='lo-blur' operator='in' result='lo' />
      <feGaussianBlur in='SourceAlpha' stdDeviation='4' />
      <feOffset dx='-2.6' dy='-2.6' result='hi-blur' />
      <feFlood floodColor={HI} />
      <feComposite in2='hi-blur' operator='in' result='hi' />
      <feMerge>
        <feMergeNode in='hi' />
        <feMergeNode in='lo' />
        <feMergeNode in='SourceGraphic' />
      </feMerge>
    </filter>
    <filter id='nd-glow' x='-50%' y='-50%' width='200%' height='200%'>
      <feGaussianBlur stdDeviation='4' result='blur' />
      <feMerge>
        <feMergeNode in='blur' />
        <feMergeNode in='SourceGraphic' />
      </feMerge>
    </filter>
    <filter id='nd-title' x='-20%' y='-60%' width='140%' height='220%'>
      <feGaussianBlur stdDeviation='20' />
    </filter>
    {ROLE_IDS.map((role) => (
      <g key={role}>
        <radialGradient id={`nd-node-${role}`} cx='0.38' cy='0.34' r='0.7'>
          <stop offset='0' style={{ stopColor: `color-mix(in oklab, ${ROLES[role]} 70%, white)` }} />
          <stop offset='0.55' style={{ stopColor: ROLES[role] }} />
          <stop offset='1' style={{ stopColor: `color-mix(in oklab, ${ROLES[role]} 80%, black)` }} />
        </radialGradient>
        <radialGradient id={`nd-halo-${role}`}>
          <stop offset='0.6' stopColor={ROLES[role]} stopOpacity={0.14} />
          <stop offset='1' stopColor={ROLES[role]} stopOpacity={0} />
        </radialGradient>
      </g>
    ))}
    <radialGradient id='nd-glow-accent'>
      <stop offset='0' stopColor={neu.accent} stopOpacity={0.7} />
      <stop offset='1' stopColor={neu.accent} stopOpacity={0} />
    </radialGradient>
  </defs>
);

/**
 * A fixed, faint noise field over the background: it dithers the dark gradient and the translucent glows drawn over
 * it, so they do not band. Seeded and static, so it never crawls.
 */
export const Background = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 38%, hsl(220 10% 19%) 0%, ${neu.bg} 50%, hsl(220 12% 8%) 125%)`,
    }}
  >
    <svg width='100%' height='100%' style={{ position: 'absolute', inset: 0, opacity: 0.07, mixBlendMode: 'overlay' }}>
      <filter id='nd-grain'>
        <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7' stitchTiles='stitch' />
        <feColorMatrix type='saturate' values='0' />
      </filter>
      <rect width='100%' height='100%' filter='url(#nd-grain)' />
    </svg>
  </AbsoluteFill>
);

/** A disc's fill: a role's gradient, or a flat color lit from the top-left. */
const discFill = (role: Role | undefined, color: string | undefined) =>
  role && !color ? `url(#nd-node-${role})` : (color ?? neu.muted);

const CHIP = { height: 44, dot: 5, lead: 16, gap: 10, trail: 20, size: 20, weight: 600 };

/** One primitive in screen space, or nothing when it is invisible or off-frame. */
export const SvgPrim = ({ prim, camera }: { prim: Prim; camera: Camera }) => {
  const opacity = prim.opacity ?? 1;
  if (opacity <= 0.002) {
    return null;
  }
  const view = prim.screen ? SCREEN : camera;
  switch (prim.kind) {
    case 'body': {
      const [x, y] = project(view, prim.x, prim.y);
      const r = prim.r * view.zoom;
      if (r < 0.5) {
        return null;
      }
      const color = prim.tint ?? (prim.role ? ROLES[prim.role] : undefined);
      return (
        <At x={x} y={y} opacity={opacity}>
          {prim.role && r < 2000 && <circle r={r * 1.35} fill={`url(#nd-halo-${prim.role})`} />}
          <circle r={r} fill={tint(color, 8)} fillOpacity={0.94} filter={r < 2000 ? 'url(#nd-raised)' : undefined} />
          <circle r={r * 0.84} fill={tint(color, 5, neu.bg)} filter={r < 2000 ? 'url(#nd-inset)' : undefined} />
          {color && <circle r={r * 0.84} fill='none' stroke={color} strokeOpacity={0.22} strokeWidth={1.5} />}
        </At>
      );
    }
    case 'node': {
      const [x, y] = project(view, prim.x, prim.y);
      const r = prim.r * view.zoom;
      if (r < 0.3) {
        return null;
      }
      const glow = 0.35 + (prim.glow ?? 0);
      const glowColor = prim.color ?? (prim.role ? ROLES[prim.role] : neu.muted);
      return (
        <At x={x} y={y} opacity={opacity}>
          {r < 1500 && (
            <circle
              r={r * (1 + 1.4 * glow)}
              fill={glowColor}
              opacity={0.1 * Math.min(1, 0.5 + glow)}
              filter='url(#nd-glow)'
            />
          )}
          <circle
            r={r}
            fill={discFill(prim.role, prim.color)}
            filter={r >= 12 && r < 1500 ? 'url(#nd-raised)' : undefined}
          />
        </At>
      );
    }
    case 'chip': {
      const [x, y] = project(view, prim.x, prim.y);
      const { height, dot, lead, gap, trail, size, weight } = CHIP;
      const width = Math.ceil(lead + dot * 2 + gap + measure(prim.text, size, weight) + trail);
      const left = -Math.round(width / 2);
      const dotX = left + lead + dot;
      const scale = prim.scale ?? 1;
      return (
        <At x={x} y={y} opacity={opacity}>
          <g transform={scale === 1 ? undefined : `scale(${scale})`}>
            <rect
              x={left}
              y={-height / 2}
              width={width}
              height={height}
              rx={height / 2}
              fill={neu.lighter}
              filter='url(#nd-chip)'
            />
            <circle cx={dotX} r={dot * 2.2} fill='url(#nd-glow-accent)' />
            <circle cx={dotX} r={dot} fill={neu.accent} />
            <Text x={dotX + dot + gap} size={size} weight={weight} anchor='start'>
              {prim.text}
            </Text>
          </g>
        </At>
      );
    }
    case 'ring': {
      const [x, y] = project(view, prim.x, prim.y);
      return (
        <At x={x} y={y} opacity={opacity}>
          <circle
            r={px(prim.r * view.zoom)}
            fill='none'
            stroke={neu.muted}
            strokeOpacity={0.3}
            strokeWidth={2}
            strokeDasharray='2 12'
            strokeLinecap='round'
          />
        </At>
      );
    }
    case 'link': {
      const progress = prim.progress ?? 1;
      if (progress <= 0) {
        return null;
      }
      const [x1, y1] = project(view, prim.x1, prim.y1);
      const [x2, y2] = project(prim.screen2 ? SCREEN : view, prim.x2, prim.y2);
      return (
        <line
          x1={x1}
          y1={y1}
          x2={x1 + (x2 - x1) * progress}
          y2={y1 + (y2 - y1) * progress}
          opacity={opacity}
          stroke={prim.hot ? neu.accent : (prim.color ?? neu.muted)}
          strokeOpacity={prim.hot ? 0.95 : 0.35}
          strokeWidth={prim.hot ? 3 : 2}
          strokeLinecap='round'
        />
      );
    }
    case 'flow': {
      const [x1, y1] = project(view, prim.x1, prim.y1);
      const [x2, y2] = project(view, prim.x2, prim.y2);
      const count = prim.count ?? 3;
      const size = prim.size ?? 6;
      return (
        <g opacity={opacity}>
          {Array.from({ length: count }, (_, index) => {
            const p = (((prim.phase + index / count) % 1) + 1) % 1;
            // Dots fade in and out at the ends, so they never pop.
            const edge = Math.min(1, p * 6, (1 - p) * 6);
            return (
              <circle
                key={index}
                cx={x1 + (x2 - x1) * p}
                cy={y1 + (y2 - y1) * p}
                r={size}
                fill={prim.color}
                filter='url(#nd-glow)'
                opacity={edge}
              />
            );
          })}
        </g>
      );
    }
    case 'label': {
      const [x, y] = project(view, prim.x, prim.y);
      return (
        <At x={x} y={y} opacity={opacity}>
          <Text
            size={prim.size ?? 24}
            weight={prim.weight ?? 600}
            fill={prim.color}
            anchor={prim.anchor}
            mono={prim.mono}
            halo={!prim.mono && !prim.plain}
          >
            {prim.text}
          </Text>
        </At>
      );
    }
    case 'title': {
      const [x, y] = project(view, prim.x, prim.y);
      const size = prim.size ?? 96;
      return (
        <At x={x} y={y} opacity={opacity}>
          <g filter='url(#nd-title)' opacity={0.16}>
            <Text size={size} weight={600} fill={neu.accent}>
              {prim.text}
            </Text>
          </g>
          <Text size={size} weight={600} fill={prim.color}>
            {prim.text}
          </Text>
        </At>
      );
    }
    case 'fill':
      return <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={prim.color} opacity={opacity} />;
    case 'logo': {
      const [x, y] = project(view, prim.x, prim.y);
      const width = prim.width;
      // The lockup's viewBox is 2:1 (see public/brand).
      const height = width / 2;
      return (
        <At x={x} y={y} opacity={opacity}>
          <image
            href={staticFile(prim.dark ? 'brand/dxos-horizontal-dark.svg' : 'brand/dxos-horizontal-white.svg')}
            x={-px(width / 2)}
            y={-px(height / 2)}
            width={px(width)}
            height={px(height)}
          />
        </At>
      );
    }
    case 'card':
      return null;
  }
};

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

/** A Composer object card: raised, with fixed two-column rows and a thread whose messages arrive in turn. */
export const Card = ({ prim }: { prim: CardPrim }) => {
  const opacity = prim.opacity ?? 1;
  if (opacity <= 0.002) {
    return null;
  }
  const messages = (prim.thread ?? []).filter((message) => prim.now >= message.at);
  return (
    <div
      style={{
        position: 'absolute',
        left: px(prim.x),
        top: px(prim.y),
        width: prim.width,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: FONTS.sans,
        color: neu.fg,
      }}
    >
      <div
        style={{
          background: neu.lighter,
          borderRadius: neu.radius,
          boxShadow: prim.accent ? `${neu.raised}, 0 0 0 1.5px ${neu.accent}` : neu.raised,
          padding: '14px 18px 16px',
        }}
      >
        <div
          style={{
            ...ellipsis,
            fontFamily: FONTS.mono,
            fontSize: 13,
            letterSpacing: '0.08em',
            color: prim.accent ? neu.accent : neu.muted,
          }}
        >
          {prim.type.toUpperCase()}
        </div>
        <div style={{ ...ellipsis, fontSize: 24, fontWeight: 600, margin: '2px 0 10px' }}>{prim.title}</div>
        {prim.rows.map(([name, value]) => (
          <div key={name} style={{ display: 'grid', gridTemplateColumns: '45% 55%', fontSize: 16, lineHeight: '26px' }}>
            <div style={{ ...ellipsis, color: neu.muted }}>{name}</div>
            <div style={{ ...ellipsis, textAlign: 'right' }}>{value}</div>
          </div>
        ))}
      </div>
      {messages.map((message) => {
        const k = Math.min(1, (prim.now - message.at) / 0.35);
        return (
          <div
            key={`${message.who}:${message.text}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr',
              columnGap: 10,
              alignItems: 'center',
              background: neu.bg,
              borderRadius: 12,
              boxShadow: neu.raisedSm,
              padding: '9px 14px',
              opacity: k,
              transform: `translateY(${px((1 - k) * 8)}px)`,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: message.bot ? 7 : 12,
                background: message.color,
                color: PALETTE.black,
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {message.who[0]}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...ellipsis, fontSize: 13, fontFamily: FONTS.mono, color: neu.muted }}>
                {message.bot ? `${message.who} · agent` : message.who}
              </div>
              <div style={{ ...ellipsis, fontSize: 16 }}>{message.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
