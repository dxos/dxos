//
// Copyright 2026 DXOS.org
//

export const SWARM_VARIANTS = ['wander', 'orbit', 'trails', 'linked'] as const;
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

const BRAND_RGB = [5, 40, 61] as const;
const GREY_LOOSE = 64;
const GREY_DOCKED = 140;
const LINK_GREY = 120;

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

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const dotFill = (settleEased: number, colorFactor: number): string => {
  const greyChannelUnrounded = lerp(GREY_LOOSE, GREY_DOCKED, settleEased);
  const redChannel = Math.round(lerp(greyChannelUnrounded, lerp(GREY_LOOSE, BRAND_RGB[0], settleEased), colorFactor));
  const greenChannel = Math.round(lerp(greyChannelUnrounded, lerp(GREY_LOOSE, BRAND_RGB[1], settleEased), colorFactor));
  const blueChannel = Math.round(lerp(greyChannelUnrounded, lerp(GREY_LOOSE, BRAND_RGB[2], settleEased), colorFactor));
  return `rgb(${redChannel},${greenChannel},${blueChannel})`;
};

export const linkStroke = (colorFactor: number): string => {
  const redChannel = Math.round(lerp(LINK_GREY, BRAND_RGB[0], colorFactor));
  const greenChannel = Math.round(lerp(LINK_GREY, BRAND_RGB[1], colorFactor));
  const blueChannel = Math.round(lerp(LINK_GREY, BRAND_RGB[2], colorFactor));
  return `rgb(${redChannel},${greenChannel},${blueChannel})`;
};

export const outroFactor = (config: SwarmConfig, dismissingForMs: number | undefined): number => {
  if (dismissingForMs === undefined) {
    return 0;
  }
  const t = Math.max(0, Math.min(1, dismissingForMs / config.outroMs));
  return smoothstep(t);
};

export const applyOutro = (
  config: SwarmConfig,
  x: number,
  y: number,
  outro: number,
): { x: number; y: number; radiusScale: number; opacityScale: number } => {
  const dx = x - config.centerX;
  const dy = y - config.centerY;
  const dist = Math.hypot(dx, dy);
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
