//
// Copyright 2026 DXOS.org
//

//
// Screen text (F-8.3, F-8.5): captions, a side title and a curtain, drawn by the animator above whatever stage the shot
// uses. Every opacity is a function of the time alone, never a CSS transition, so an exported frame matches playback.
//

import { beatTimes } from '@dxos/animation';

import { type Animation } from '#types';

/** Seconds screen text takes to fade in and to fade out unless it says otherwise. */
export const SCREEN_FADE = 0.6;
/** Seconds between a caption's lines appearing under its headline. */
export const CAPTION_STAGGER = 0.8;
/** The curtain's colour unless it names one. */
export const CURTAIN_COLOR = '#000000';

/** One piece of screen text on the shot's clock. */
export type ScreenSpan = {
  kind: Animation.ScreenTextKind;
  start: number;
  end: number;
  lines: string[];
  image?: string;
  color?: string;
  fade: number;
  stagger: number;
};

/** What screen text shows at one time, with every opacity resolved. */
export type ScreenFrame = {
  caption?: {
    /** The headline (unless an image takes its place), then the lines under it. */
    lines: { text: string; opacity: number }[];
    image?: { src: string; opacity: number };
    color?: string;
    opacity: number;
  };
  sideTitle?: { lines: string[]; opacity: number };
  curtain?: { color: string; opacity: number };
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 0 to 1 over `fade` seconds from `elapsed` 0; a span with no fade is at once full. */
const ramp = (elapsed: number, fade: number) => (fade <= 0 ? (elapsed >= 0 ? 1 : 0) : clamp01(elapsed / fade));

const splitLines = (text: string | undefined): string[] => (text ? text.split('\n') : []);

const fromText = (text: Animation.ScreenText): ScreenSpan => ({
  kind: text.kind,
  start: text.at,
  end: text.at + text.duration,
  lines: splitLines(text.text),
  ...(text.image ? { image: text.image } : {}),
  ...(text.color ? { color: text.color } : {}),
  fade: text.fade ?? SCREEN_FADE,
  stagger: text.stagger ?? CAPTION_STAGGER,
});

/**
 * The shot's screen text: what it places by hand, and what its script's beats add. A caption or side title beat holds
 * until the next beat that sets one (an empty string clears it) or the shot ends; a curtain fades down, holds and fades
 * back up from its beat's start.
 */
export const screenSpans = (shot: Pick<Animation.Shot, 'duration' | 'script' | 'screen'>): ScreenSpan[] => {
  const spans = (shot.screen ?? []).map(fromText);
  const script = shot.script ?? [];
  const times = beatTimes(script);
  const open: Partial<Record<'caption' | 'side-title', ScreenSpan>> = {};
  const replace = (kind: 'caption' | 'side-title', start: number, next: ScreenSpan | undefined) => {
    const current = open[kind];
    if (current) {
      current.end = start;
    }
    open[kind] = next;
    if (next) {
      spans.push(next);
    }
  };
  script.forEach((beat, index) => {
    const { start } = times[index];
    const base = { start, end: shot.duration, fade: SCREEN_FADE, stagger: CAPTION_STAGGER };
    if (beat.caption !== undefined) {
      replace(
        'caption',
        start,
        beat.caption.length > 0 || beat.captionImage
          ? {
              ...base,
              kind: 'caption',
              lines: splitLines(beat.caption),
              ...(beat.captionImage ? { image: beat.captionImage } : {}),
              ...(beat.captionColor ? { color: beat.captionColor } : {}),
            }
          : undefined,
      );
    }
    if (beat.sideTitle !== undefined) {
      replace(
        'side-title',
        start,
        beat.sideTitle.length > 0 ? { ...base, kind: 'side-title', lines: splitLines(beat.sideTitle) } : undefined,
      );
    }
    if (beat.curtain) {
      const fade = beat.curtain.fade ?? SCREEN_FADE;
      spans.push({
        ...base,
        kind: 'curtain',
        end: start + fade * 2 + (beat.curtain.hold ?? 0),
        lines: [],
        color: beat.curtain.color ?? CURTAIN_COLOR,
        fade,
      });
    }
  });
  return spans.sort((left, right) => left.start - right.start);
};

/** A span's opacity at `t`: fading in from its start and out to its end. */
const spanOpacity = (span: ScreenSpan, t: number) =>
  Math.min(ramp(t - span.start, span.fade), ramp(span.end - t, span.fade));

/** The latest-starting span of `kind` showing at `t`. */
const showing = (spans: readonly ScreenSpan[], kind: Animation.ScreenTextKind, t: number) =>
  spans.filter((span) => span.kind === kind && t >= span.start && t < span.end).at(-1);

/**
 * What the screen shows at `t` seconds into the shot. A caption's headline comes up with it; each line under the
 * headline fades in `stagger` seconds after the one before, the first once the headline is up.
 */
export const screenAt = (spans: readonly ScreenSpan[], t: number): ScreenFrame => {
  const frame: ScreenFrame = {};
  const caption = showing(spans, 'caption', t);
  if (caption) {
    const opacity = spanOpacity(caption, t);
    const headed = caption.image === undefined;
    frame.caption = {
      opacity,
      ...(caption.image ? { image: { src: caption.image, opacity } } : {}),
      ...(caption.color ? { color: caption.color } : {}),
      lines: caption.lines.map((text, index) => {
        const order = headed ? index - 1 : index;
        if (order < 0) {
          return { text, opacity };
        }
        const appears = caption.start + caption.fade + order * caption.stagger;
        return { text, opacity: Math.min(opacity, ramp(t - appears, caption.fade)) };
      }),
    };
  }
  const sideTitle = showing(spans, 'side-title', t);
  if (sideTitle) {
    frame.sideTitle = { lines: sideTitle.lines, opacity: spanOpacity(sideTitle, t) };
  }
  const curtain = showing(spans, 'curtain', t);
  if (curtain) {
    frame.curtain = { color: curtain.color ?? CURTAIN_COLOR, opacity: spanOpacity(curtain, t) };
  }
  return frame;
};
