//
// Copyright 2026 DXOS.org
//

export const SWARM_VARIANTS = ['wander', 'orbit', 'trails', 'linked', 'halo', 'arc'] as const;
export type SwarmVariant = (typeof SWARM_VARIANTS)[number];

export type SwarmConfig = {
  variant: SwarmVariant;
  dotCount: number;
  dotSize: number;
  centerX: number;
  centerY: number;
  ringRadius: number;
  outerRadius: number;
  nogoRadius: number;
  spiralLead: number;
  settleMs: number;
  unsettleMs: number;
  ringRotationSpeed: number;
  wanderAmplitude: number;
  ghostCount: number;
  ghostIntervalMs: number;
  linkRange: number;
  maxLinks: number;
  outroScale: number;
  outroMs: number;
};

export type SwarmDot = {
  angle: number;
  startX: number;
  startY: number;
  orbitRadius: number;
  orbitBearing: number;
  orbitSpeed: number;
  phase: number;
  settle: number;
  x: number;
  y: number;
};

// Dots wear the mark's own palette — the field-level grayscale filter (see
// `boot-loader.css`) greys them identically to the mark until ready/hover.
const LOOSE_RGB = [1, 122, 183] as const; // The mark's mid ring.
const DOCKED_RGB = [5, 40, 61] as const; // The mark's outer ring.

/** Stroke for the transient proximity links between swarming dots. */
export const TRANSIENT_LINK_COLOR = 'rgb(1,122,183)';
/** Stroke for the welded chain between docked ring neighbours. */
export const RING_LINK_COLOR = 'rgb(5,40,61)';

/** Radial gap between the halo variant's two counter-rotating rings. */
export const HALO_RING_GAP = 12;
/** Chance that a close inner/outer halo pass draws a link. */
const HALO_LINK_PROBABILITY = 0.5;
/** How long (ms) a halo pass keeps its random link decision. */
const HALO_LINK_DECISION_MS = 800;

// Deterministic per (pair, time-bucket) so a pass's link neither flickers per
// frame nor repeats identically forever.
const pairHash = (first: number, second: number, bucket: number): number => {
  const seed = Math.sin(first * 127.1 + second * 311.7 + bucket * 74.7) * 43758.5453;
  return seed - Math.floor(seed);
};

const BASE: Omit<SwarmConfig, 'variant' | 'dotCount' | 'dotSize' | 'ringRotationSpeed'> = {
  centerX: 200,
  centerY: 150,
  ringRadius: 76,
  outerRadius: 136,
  nogoRadius: 60,
  spiralLead: 0.55,
  settleMs: 450,
  unsettleMs: 300,
  wanderAmplitude: 55,
  ghostCount: 4,
  ghostIntervalMs: 45,
  linkRange: 46,
  maxLinks: 40,
  outroScale: 2.2,
  outroMs: 600,
};

export const defaultSwarmConfig = (variant: SwarmVariant): SwarmConfig => {
  switch (variant) {
    case 'wander':
      return { ...BASE, variant, dotCount: 20, dotSize: 2.8, ringRotationSpeed: 0 };
    case 'orbit':
      return { ...BASE, variant, dotCount: 32, dotSize: 2.0, ringRotationSpeed: 0.00015 };
    case 'trails':
      return { ...BASE, variant, dotCount: 48, dotSize: 1.6, ringRotationSpeed: 0 };
    case 'linked':
      return { ...BASE, variant, dotCount: 64, dotSize: 1.3, ringRotationSpeed: 0 };
    case 'halo':
      // A tight ring hugging the no-go rim; tiny dots orbit fast, each at its
      // own rate (ringRotationSpeed is the shared base; per-dot orbitSpeed adds
      // the variation). linkRange only needs to span the inter-ring gap.
      return {
        ...BASE,
        variant,
        dotCount: 24,
        dotSize: 0.9,
        ringRotationSpeed: 0.0008,
        ringRadius: 66,
        linkRange: 18,
      };
    case 'arc':
      // The original determinate ring (`ClassicRing.tsx`) — no dots.
      return { ...BASE, variant, dotCount: 0, dotSize: 0, ringRotationSpeed: 0 };
  }
};

export const pickRandomVariant = (random: () => number = Math.random): SwarmVariant =>
  SWARM_VARIANTS[Math.min(SWARM_VARIANTS.length - 1, Math.floor(random() * SWARM_VARIANTS.length))];

export const createDots = (config: SwarmConfig, random: () => number = Math.random): SwarmDot[] => {
  const dots: SwarmDot[] = [];
  for (let index = 0; index < config.dotCount; index++) {
    const angle = -Math.PI / 2 - (index / config.dotCount) * 2 * Math.PI;
    const startX = config.centerX + config.outerRadius * Math.cos(angle + config.spiralLead);
    const startY = config.centerY + config.outerRadius * Math.sin(angle + config.spiralLead);
    const orbitRadius = config.nogoRadius + 14 + random() * (config.outerRadius - config.nogoRadius - 22);
    const orbitBearing = random() * 2 * Math.PI;
    const orbitSpeed = 0.00025 + random() * 0.00035;
    const phase = random() * 2 * Math.PI;

    dots.push({
      angle,
      startX,
      startY,
      orbitRadius,
      orbitBearing,
      orbitSpeed,
      phase,
      settle: 0,
      x: startX,
      y: startY,
    });
  }
  return dots;
};

export const litCount = (config: SwarmConfig, progressPct: number): number => (progressPct / 100) * config.dotCount;

export const slotPosition = (config: SwarmConfig, dot: SwarmDot, nowMs: number): { x: number; y: number } => {
  const rotation = -nowMs * config.ringRotationSpeed;
  return {
    x: config.centerX + config.ringRadius * Math.cos(dot.angle + rotation),
    y: config.centerY + config.ringRadius * Math.sin(dot.angle + rotation),
  };
};

export const stepSettle = (config: SwarmConfig, dot: SwarmDot, index: number, lit: number, dtMs: number): number => {
  if (index < lit) {
    dot.settle = Math.min(1, dot.settle + dtMs / config.settleMs);
  } else {
    dot.settle = Math.max(0, dot.settle - dtMs / config.unsettleMs);
  }
  return easeOutCubic(dot.settle);
};

export const projectNogo = (config: SwarmConfig, x: number, y: number): { x: number; y: number } => {
  const dx = x - config.centerX;
  const dy = y - config.centerY;
  const dist = Math.hypot(dx, dy);
  if (dist < config.nogoRadius) {
    const scale = config.nogoRadius / Math.max(dist, 1e-6);
    return {
      x: config.centerX + dx * scale,
      y: config.centerY + dy * scale,
    };
  }
  return { x, y };
};

export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);

export const smoothstep = (x: number): number => {
  const clamped = Math.max(0, Math.min(1, x));
  return clamped * clamped * (3 - 2 * clamped);
};

const lerp = (from: number, to: number, fraction: number): number => from + (to - from) * fraction;

export const dotFill = (settleEased: number): string => {
  const redChannel = Math.round(lerp(LOOSE_RGB[0], DOCKED_RGB[0], settleEased));
  const greenChannel = Math.round(lerp(LOOSE_RGB[1], DOCKED_RGB[1], settleEased));
  const blueChannel = Math.round(lerp(LOOSE_RGB[2], DOCKED_RGB[2], settleEased));
  return `rgb(${redChannel},${greenChannel},${blueChannel})`;
};

export const outroFactor = (config: SwarmConfig, dismissingForMs: number | undefined): number => {
  if (dismissingForMs === undefined) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(1, dismissingForMs / config.outroMs));
  return smoothstep(clamped);
};

export const applyOutro = (
  config: SwarmConfig,
  x: number,
  y: number,
  outro: number,
): { x: number; y: number; radiusScale: number; opacityScale: number } => {
  const dx = x - config.centerX;
  const dy = y - config.centerY;
  const scale = 1 + outro * config.outroScale;
  const outroX = config.centerX + dx * scale;
  const outroY = config.centerY + dy * scale;
  const radiusScale = 1 - outro * 0.85;
  const opacityScale = 1 - outro;
  return {
    x: outroX,
    y: outroY,
    radiusScale,
    opacityScale,
  };
};

export const dotPosition = (
  config: SwarmConfig,
  dot: SwarmDot,
  settleEased: number,
  nowMs: number,
): { x: number; y: number } => {
  // Halo dots never wander: alternating dots ride two tight counter-rotating
  // rings (inner anticlockwise, outer clockwise), each at its own fast rate
  // (base speed + per-dot variation), and only fade in as they dock.
  if (config.variant === 'halo') {
    // Recover the dot's slot index from its bearing to split rings deterministically.
    const slotIndex = Math.round(((-Math.PI / 2 - dot.angle) * config.dotCount) / (2 * Math.PI));
    const onOuterRing = slotIndex % 2 === 1;
    const radius = onOuterRing ? config.ringRadius + HALO_RING_GAP : config.ringRadius;
    const rate = config.ringRotationSpeed + dot.orbitSpeed;
    const bearing = onOuterRing ? dot.angle + nowMs * rate : dot.angle - nowMs * rate;
    return projectNogo(
      config,
      config.centerX + radius * Math.cos(bearing),
      config.centerY + radius * Math.sin(bearing),
    );
  }

  let waitingX: number;
  let waitingY: number;

  if (config.variant === 'wander' || config.variant === 'linked') {
    // Rotation-free slot position for wander/linked.
    const slotWithoutRotation = {
      x: config.centerX + config.ringRadius * Math.cos(dot.angle),
      y: config.centerY + config.ringRadius * Math.sin(dot.angle),
    };

    const midpointX = (dot.startX + slotWithoutRotation.x) / 2;
    const midpointY = (dot.startY + slotWithoutRotation.y) / 2;

    const amplitude = config.wanderAmplitude * (1 - settleEased);
    const driftX =
      Math.sin(nowMs / 900 + dot.phase * 3) * amplitude + Math.sin(nowMs / 331 + dot.phase) * amplitude * 0.3;
    const driftY =
      Math.cos(nowMs / 1100 + dot.phase * 2) * amplitude + Math.cos(nowMs / 411 + dot.phase) * amplitude * 0.3;

    waitingX = midpointX + driftX;
    waitingY = midpointY + driftY;
  } else {
    // orbit or trails: orbital motion with wobble.
    const wobble = Math.sin(nowMs / 700 + dot.phase) * 5 * (1 - settleEased);
    const effectiveRadius = dot.orbitRadius + wobble;
    const angle = dot.orbitBearing - nowMs * dot.orbitSpeed;

    waitingX = config.centerX + effectiveRadius * Math.cos(angle);
    waitingY = config.centerY + effectiveRadius * Math.sin(angle);
  }

  const slot = slotPosition(config, dot, nowMs);
  const lerpedX = waitingX + (slot.x - waitingX) * settleEased;
  const lerpedY = waitingY + (slot.y - waitingY) * settleEased;

  return projectNogo(config, lerpedX, lerpedY);
};

/**
 * Halo cross-ring links: an inner-ring and an outer-ring dot passing within
 * `linkRange` connect with probability {@link HALO_LINK_PROBABILITY}, holding
 * each decision for {@link HALO_LINK_DECISION_MS} so links persist while the
 * pair stays close. Only visible (fading-in or docked) dots participate.
 */
export const haloLinks = (
  config: SwarmConfig,
  dots: SwarmDot[],
  nowMs: number,
): { first: number; second: number; closeness: number }[] => {
  const links: { first: number; second: number; closeness: number }[] = [];
  const bucket = Math.floor(nowMs / HALO_LINK_DECISION_MS);
  for (let inner = 0; inner < dots.length && links.length < config.maxLinks; inner += 2) {
    if (dots[inner].settle < 0.3) {
      continue;
    }
    for (let outer = 1; outer < dots.length && links.length < config.maxLinks; outer += 2) {
      if (dots[outer].settle < 0.3) {
        continue;
      }
      const dx = dots[inner].x - dots[outer].x;
      const dy = dots[inner].y - dots[outer].y;
      const distance = Math.hypot(dx, dy);
      if (distance > config.linkRange) {
        continue;
      }
      if (pairHash(inner, outer, bucket) > HALO_LINK_PROBABILITY) {
        continue;
      }
      links.push({ first: inner, second: outer, closeness: 1 - distance / config.linkRange });
    }
  }
  return links;
};

export const transientLinks = (
  config: SwarmConfig,
  dots: SwarmDot[],
): { first: number; second: number; closeness: number }[] => {
  const links: { first: number; second: number; closeness: number }[] = [];

  for (let indexA = 0; indexA < dots.length; indexA++) {
    if (dots[indexA].settle > 0.5) {
      continue;
    }

    for (let indexB = indexA + 1; indexB < dots.length; indexB++) {
      if (dots[indexB].settle > 0.5) {
        continue;
      }

      const dx = dots[indexB].x - dots[indexA].x;
      const dy = dots[indexB].y - dots[indexA].y;
      const distance = Math.hypot(dx, dy);

      if (distance < config.linkRange) {
        const closeness = 1 - distance / config.linkRange;
        links.push({ first: indexA, second: indexB, closeness });

        if (links.length >= config.maxLinks) {
          return links;
        }
      }
    }
  }

  return links;
};

export const ringLinkVisible = (dots: SwarmDot[], index: number): boolean => {
  const current = dots[index];
  const next = dots[(index + 1) % dots.length];
  return current.settle >= 1 && next.settle >= 1;
};
