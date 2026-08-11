//
// Copyright 2026 DXOS.org
//

import { type Component, onCleanup, onMount } from 'solid-js';

import { ClassicRing } from './ClassicRing';
import { type LoaderStore } from './store';
import {
  RING_LINK_COLOR,
  type SwarmConfig,
  type SwarmDot,
  type SwarmVariant,
  TRANSIENT_LINK_COLOR,
  applyOutro,
  createDots,
  defaultSwarmConfig,
  dotFill,
  dotPosition,
  haloLinks,
  litCount,
  outroFactor,
  pickRandomVariant,
  ringLinkVisible,
  slotPosition,
  stepSettle,
  transientLinks,
} from './swarm';

export type SwarmProps = {
  store: LoaderStore;
  markSvg?: string;
  /** Storybook/testing overrides; production passes nothing and gets a random variant. */
  config?: Partial<SwarmConfig> & { variant?: SwarmVariant };
};

const MARK_SIZE = 84;
// The C's arc hub sits at the icon's box centre, so box-centring the nested svg
// keeps the mark concentric with the dot ring (the bbox skews left only because
// the C opens right — do not "optically" correct it).
const MARK_HALF = MARK_SIZE / 2;

// Snaps `shown` to the target within 5% so a large progress jump doesn't leave a visible eased trail.
const SHOWN_SNAP_THRESHOLD = 0.05;
const SHOWN_EASE_RATE = 0.18;
const MAX_FRAME_DELTA_MS = 50;

type GhostPoint = { x: number; y: number };

/**
 * The boot loader's constellation field: a pool of dots that spiral in from the
 * outer ring and dock onto the progress ring as `store.progress()` advances,
 * rendered as raw SVG attribute writes from a single `requestAnimationFrame`
 * loop (mirrors the eased-progress pattern the old ring loop used). Variant,
 * dot count, and per-frame behaviour all come from `swarm.ts`'s pure math —
 * this component only owns the DOM pools and the frame driver.
 */
export const Swarm: Component<SwarmProps> = (props) => {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const config: SwarmConfig = {
    ...defaultSwarmConfig(props.config?.variant ?? pickRandomVariant()),
    ...props.config,
  };
  if (config.variant === 'arc') {
    // The original ring, verbatim — its own DOM, CSS, and easing for comparison.
    return <ClassicRing store={props.store} markSvg={props.markSvg} />;
  }
  const dots: SwarmDot[] = createDots(config);
  const hasTrails = config.variant === 'trails';
  const hasLinks = config.variant === 'linked';
  const hasHalo = config.variant === 'halo';

  let fieldRef: SVGSVGElement | undefined;
  let markRef: SVGSVGElement | undefined;
  const dotRefs: SVGCircleElement[] = [];
  const ghostRefs: SVGCircleElement[][] = [];
  const linkRefs: SVGLineElement[] = [];
  const ringLinkRefs: SVGLineElement[] = [];

  // Rolling per-dot ghost trail, most-recent-first; seeded at the dot's entry point.
  const ghostTrails: GhostPoint[][] = hasTrails
    ? dots.map((dot) => Array.from({ length: config.ghostCount }, () => ({ x: dot.startX, y: dot.startY })))
    : [];

  let hover = false;
  let dismissingSince: number | undefined;
  let shown = props.store.progress();
  let ghostElapsedMs = 0;
  let lastFrameMs: number | undefined;
  let raf: number | undefined;

  const handleMouseEnter = (): void => {
    hover = true;
  };
  const handleMouseLeave = (): void => {
    hover = false;
  };

  const shiftGhostTrail = (index: number, headX: number, headY: number): void => {
    const trail = ghostTrails[index];
    for (let ghostIndex = trail.length - 1; ghostIndex > 0; ghostIndex--) {
      trail[ghostIndex] = trail[ghostIndex - 1];
    }
    trail[0] = { x: headX, y: headY };
  };

  const animate = (nowMs: number): void => {
    const dtMs = lastFrameMs === undefined ? 0 : Math.min(MAX_FRAME_DELTA_MS, nowMs - lastFrameMs);
    lastFrameMs = nowMs;

    const target = props.store.progress();
    shown = Math.abs(target - shown) < SHOWN_SNAP_THRESHOLD ? target : shown + (target - shown) * SHOWN_EASE_RATE;

    const phase = props.store.phase();
    if (phase === 'dismissing' && dismissingSince === undefined) {
      dismissingSince = nowMs;
    }
    const outro = outroFactor(config, dismissingSince === undefined ? undefined : nowMs - dismissingSince);

    // The CSS filter transition on `#boot-loader-swarm` does the actual cross-fade.
    const wantColor = phase === 'dismissing' || hover;

    const lit = litCount(config, shown);
    ghostElapsedMs += dtMs;
    const shiftGhosts = hasTrails && !reducedMotion && ghostElapsedMs >= config.ghostIntervalMs;
    if (shiftGhosts) {
      ghostElapsedMs -= config.ghostIntervalMs;
    }

    for (let index = 0; index < dots.length; index++) {
      const dot = dots[index];
      let settleEased: number;
      let position: { x: number; y: number };
      if (reducedMotion) {
        dot.settle = index < lit ? 1 : 0;
        settleEased = dot.settle;
        position = slotPosition(config, dot, 0);
      } else {
        settleEased = stepSettle(config, dot, index, lit, dtMs);
        position = dotPosition(config, dot, settleEased, nowMs);
      }

      let { x, y } = position;
      let radiusScale = 1;
      let opacityScale = 1;
      if (outro > 0) {
        if (reducedMotion) {
          // Fade only — no radial fling or radius shrink under reduced motion.
          opacityScale = applyOutro(config, x, y, outro).opacityScale;
        } else {
          const flung = applyOutro(config, x, y, outro);
          x = flung.x;
          y = flung.y;
          radiusScale = flung.radiusScale;
          opacityScale = flung.opacityScale;
        }
      }

      dot.x = x;
      dot.y = y;

      const circle = dotRefs[index];
      if (circle) {
        // Halo dots fade in from nothing on their slots; other variants dim while loose.
        const baseOpacity = (reducedMotion && index >= lit) || hasHalo ? settleEased : 0.55 + 0.45 * settleEased;
        circle.setAttribute('cx', String(x));
        circle.setAttribute('cy', String(y));
        circle.setAttribute('r', String(config.dotSize * radiusScale));
        circle.setAttribute('fill', dotFill(settleEased));
        circle.setAttribute('opacity', String(baseOpacity * opacityScale));
      }

      if (hasTrails && !reducedMotion) {
        if (shiftGhosts) {
          shiftGhostTrail(index, x, y);
        }
        const trail = ghostTrails[index];
        const refs = ghostRefs[index];
        for (let ghostIndex = 0; ghostIndex < trail.length; ghostIndex++) {
          const ghost = refs?.[ghostIndex];
          if (!ghost) {
            continue;
          }
          const point = trail[ghostIndex];
          const ghostOpacity = (1 - settleEased) * 0.35 * (1 - ghostIndex / config.ghostCount);
          ghost.setAttribute('cx', String(point.x));
          ghost.setAttribute('cy', String(point.y));
          ghost.setAttribute('opacity', String(ghostOpacity));
        }
      }
    }

    if (hasLinks || hasHalo) {
      // Unlit dots sit invisibly on their slots and are still in link range, so skip transient links entirely.
      const links = reducedMotion ? [] : hasHalo ? haloLinks(config, dots, nowMs) : transientLinks(config, dots);
      for (let index = 0; index < linkRefs.length; index++) {
        const line = linkRefs[index];
        const link = links[index];
        if (link) {
          const dotA = dots[link.first];
          const dotB = dots[link.second];
          line.setAttribute('x1', String(dotA.x));
          line.setAttribute('y1', String(dotA.y));
          line.setAttribute('x2', String(dotB.x));
          line.setAttribute('y2', String(dotB.y));
          line.setAttribute('opacity', String(0.25 * link.closeness));
        } else {
          line.setAttribute('opacity', '0');
        }
      }

      const ringOpacity = hasLinks ? 0.5 * Math.max(0, 1 - outro * 2.5) : 0;
      for (let index = 0; index < ringLinkRefs.length; index++) {
        const line = ringLinkRefs[index];
        if (ringLinkVisible(dots, index)) {
          const dotA = dots[index];
          const dotB = dots[(index + 1) % dots.length];
          line.setAttribute('x1', String(dotA.x));
          line.setAttribute('y1', String(dotA.y));
          line.setAttribute('x2', String(dotB.x));
          line.setAttribute('y2', String(dotB.y));
          line.setAttribute('opacity', String(ringOpacity));
        } else {
          line.setAttribute('opacity', '0');
        }
      }
    }

    fieldRef?.classList.toggle('boot-loader-color', wantColor);

    raf = requestAnimationFrame(animate);
  };

  onMount(() => {
    markRef?.addEventListener('mouseenter', handleMouseEnter);
    markRef?.addEventListener('mouseleave', handleMouseLeave);
    raf = requestAnimationFrame(animate);
  });

  onCleanup(() => {
    markRef?.removeEventListener('mouseenter', handleMouseEnter);
    markRef?.removeEventListener('mouseleave', handleMouseLeave);
    if (raf !== undefined) {
      cancelAnimationFrame(raf);
    }
  });

  return (
    <svg
      id='boot-loader-swarm'
      ref={fieldRef}
      viewBox='0 0 400 300'
      preserveAspectRatio='xMidYMid meet'
      aria-hidden='true'
    >
      {(hasLinks || hasHalo) &&
        Array.from({ length: config.maxLinks }, (_, index) => (
          <line ref={(element) => (linkRefs[index] = element)} opacity={0} stroke={TRANSIENT_LINK_COLOR} />
        ))}
      {hasLinks &&
        dots.map((_, index) => (
          <line
            ref={(element) => (ringLinkRefs[index] = element)}
            opacity={0}
            stroke={RING_LINK_COLOR}
            stroke-width={0.5}
          />
        ))}
      {hasTrails &&
        dots.flatMap((dot, dotIndex) =>
          Array.from({ length: config.ghostCount }, (_, ghostIndex) => (
            <circle
              ref={(element) => {
                (ghostRefs[dotIndex] ??= [])[ghostIndex] = element;
              }}
              cx={dot.startX}
              cy={dot.startY}
              r={config.dotSize}
              fill={dotFill(0)}
              opacity={0}
            />
          )),
        )}
      {dots.map((dot, index) => (
        <circle
          ref={(element) => (dotRefs[index] = element)}
          cx={dot.startX}
          cy={dot.startY}
          r={config.dotSize}
          fill={dotFill(0)}
        />
      ))}
      <svg
        id='boot-loader-swarm-mark'
        ref={markRef}
        x={config.centerX - MARK_HALF}
        y={config.centerY - MARK_HALF}
        width={MARK_SIZE}
        height={MARK_SIZE}
        innerHTML={props.markSvg ?? ''}
      />
    </svg>
  );
};
