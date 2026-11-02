//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Placed, ramp } from './engine.ts';
import { neu } from './theme.tsx';
import { FONTS } from './tokens.ts';

/** The story's chapters, each a run of scenes; the chip in the corner names the one playing. */
const CHAPTERS: { title: string; scenes: string[] }[] = [
  { title: 'SaaS', scenes: ['beginning', 'silo', 'silo-comms'] },
  { title: 'Scale', scenes: ['scale', 'competitors', 'spread', 'spread-comms'] },
  { title: 'AI', scenes: ['frontier', 'frontier-comms', 'orbit', 'absorb'] },
  { title: 'Consolidation', scenes: ['rivals', 'merge-1', 'final-frontier', 'engulf'] },
  { title: 'The Alternative', scenes: ['dont-panic', 'spread-again'] },
  { title: 'ECHO', scenes: ['echo-hub', 'echo-spaces'] },
  // The chip leaves before the chat cards of `object-created`, which carry their own labels.
  { title: 'Composer', scenes: ['objects', 'object-detail', 'object-thread'] },
  { title: 'DXOS', scenes: ['echo-hub-again', 'saas-merge'] },
];

/**
 * One line under each scene; the bracketed phrase is highlighted. Scenes that already set text on screen have none.
 */
const SUBTITLES: Record<string, string> = {
  'silo': 'Your data lived [in SaaS]',
  'silo-comms': 'No servers, software [simply arrived]',
  'scale': 'Vendors grew [by scale]',
  'competitors': 'Every vendor dug [a moat]',
  'spread': 'Soon, [dozens of silos]',
  'spread-comms': 'Every app keeps [a copy of your data]',
  'frontier': 'Then came [AI]',
  'frontier-comms': 'We handed agents [the keys]',
  'orbit': 'The labs grew [cleverer by the month]',
  'absorb': 'One by one, apps were [absorbed]',
  'rivals': 'Each lab sought [to stand apart]',
  'merge-1': 'Partnerships, then [acquisitions]',
  'engulf': 'One entity [holds everything]',
  'spread-again': 'Suppose you kept your data [at home]',
  'echo-hub': 'Your data, [your agents]',
  'echo-spaces': 'Spaces you share, [one graph]',
  'objects': 'Documents, records and [messages]',
  'object-detail': 'Over [a hundred plugins]',
  'object-thread': 'People and agents, [side by side]',
  'object-created': 'Work that [builds on itself]',
  'echo-spaces-again': 'The [memory] of the enterprise',
  'echo-hub-again': 'Compute and intelligence, [at home]',
  'saas-merge': 'The vendors become [less essential]',
};

/** How long a chip or line takes to fade in or out, in seconds. */
const FADE = 0.3;

/** The scene playing, and how far into and before the end of it `seconds` is. */
const sceneAt = (timeline: Placed[], seconds: number, total: number) => {
  const index = Math.max(
    0,
    timeline.findLastIndex((placed) => placed.start <= seconds),
  );
  const end = timeline[index + 1]?.start ?? total;
  return { id: timeline[index].slide.id, into: seconds - timeline[index].start, left: end - seconds };
};

/** The span of scenes in `timeline` that `ids` covers, as start and end seconds. */
const spanOf = (timeline: Placed[], ids: string[], total: number): [number, number] | undefined => {
  const indices = timeline.flatMap((placed, index) => (ids.includes(placed.slide.id) ? [index] : []));
  if (indices.length === 0) {
    return undefined;
  }
  const last = indices[indices.length - 1];
  return [timeline[indices[0]].start, timeline[last + 1]?.start ?? total];
};

const fade = (into: number, left: number) => Math.max(0, Math.min(1, into / FADE, left / FADE));

/** The chapter chip, top left: its number on the accent, its title beside it. */
const Chip = ({ number, title, opacity }: { number: number; title: string; opacity: number }) => (
  <div
    style={{
      position: 'absolute',
      left: 72,
      top: 60,
      display: 'flex',
      alignItems: 'stretch',
      height: 58,
      opacity,
      boxShadow: '6px 6px 16px rgba(0, 0, 0, 0.45)',
      font: `500 30px ${FONTS.mono}`,
      letterSpacing: '0.08em',
    }}
  >
    <div
      style={{ display: 'flex', alignItems: 'center', padding: '0 18px', background: neu.accent, color: neu.onAccent }}
    >
      {String(number).padStart(2, '0')}
    </div>
    <div
      style={{ display: 'flex', alignItems: 'center', padding: '0 22px', background: neu.lighter, color: '#e8ebf0' }}
    >
      {title.toUpperCase()}
    </div>
  </div>
);

/** A subtitle line, its bracketed phrase set on the accent, rising into place over the first half second. */
const Line = ({ text, opacity, into }: { text: string; opacity: number; into: number }) => {
  const [before, highlight = '', after = ''] = text.split(/\[|\]/);
  const risen = ramp(into, 0.1, 0.5);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 70,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        font: `700 64px ${FONTS.sans}`,
        color: '#f4f6f8',
        whiteSpace: 'pre',
        textShadow: '0 2px 12px rgba(0, 0, 0, 0.6)',
      }}
    >
      <span>{before}</span>
      {highlight && (
        <span
          style={{
            background: neu.accent,
            color: neu.onAccent,
            padding: '0 16px',
            textShadow: 'none',
            opacity: risen,
            transform: `translateY(${(1 - risen) * 36}px)`,
          }}
        >
          {highlight}
        </span>
      )}
      <span>{after}</span>
    </div>
  );
};

/** The chapter chip and the subtitle for the moment `seconds` of `timeline`. */
export const Captions = ({
  timeline,
  seconds,
  total,
  subtitles = SUBTITLES,
}: {
  timeline: Placed[];
  seconds: number;
  total: number;
  subtitles?: Record<string, string>;
}) => {
  const scene = sceneAt(timeline, seconds, total);
  const chapter = CHAPTERS.findIndex(({ scenes }) => scenes.includes(scene.id));
  const span = chapter >= 0 ? spanOf(timeline, CHAPTERS[chapter].scenes, total) : undefined;
  const text = subtitles[scene.id];
  return (
    <>
      {span && (
        <Chip
          number={chapter + 1}
          title={CHAPTERS[chapter].title}
          opacity={fade(seconds - span[0], span[1] - seconds)}
        />
      )}
      {text && <Line text={text} opacity={fade(scene.into, scene.left)} into={scene.into} />}
    </>
  );
};
