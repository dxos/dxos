import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';

import { COLORS, DEFAULT_TURN, TIMING } from './brand';
import { EndCard, OpenTitle, WordBuild } from './components';
import { loadBrandFont } from './fonts';
import { PROVOCATIONS } from './provocations';

loadBrandFont();

export type SpotProps = { provocationId: string };

const find = (id: string) => {
  const p = PROVOCATIONS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown provocation ${id}`);
  return p;
};

/** 10s: provocation (build, hold, cut to black) then the end card. */
export const Spot10: React.FC<SpotProps> = ({ provocationId }) => {
  const { fps } = useVideoConfig();
  const p = find(provocationId);
  const s = TIMING.spot10;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ground }}>
      <Sequence durationInFrames={s.provocation * fps}>
        <WordBuild lines={p.lines} cutAt={s.cutToBlack} />
      </Sequence>
      <Sequence from={s.provocation * fps} durationInFrames={s.endCard * fps}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};

/** 30s: provocation, beat, the turn, the resolve line, then the end card. */
export const Spot30: React.FC<SpotProps> = ({ provocationId }) => {
  const { fps } = useVideoConfig();
  const p = find(provocationId);
  const s = TIMING.spot30;
  const turnAt = s.provocation;
  const resolveAt = turnAt + s.turn;
  const endAt = resolveAt + s.resolve;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ground }}>
      <Sequence durationInFrames={s.provocation * fps}>
        <WordBuild lines={p.lines} cutAt={s.provocationCut} />
      </Sequence>
      <Sequence from={turnAt * fps} durationInFrames={s.turn * fps}>
        <WordBuild lines={p.turn ?? DEFAULT_TURN} cutAt={s.turnCut} />
      </Sequence>
      <Sequence from={resolveAt * fps} durationInFrames={s.resolve * fps}>
        <WordBuild lines={[p.resolve]} cutAt={s.resolveCut} />
      </Sequence>
      <Sequence from={endAt * fps} durationInFrames={s.endCard * fps}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};

/** End card only: the last 3s of the 10s spot (from 7s). */
export const EndOnly: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.ground }}>
    <EndCard />
  </AbsoluteFill>
);

/** Opening title on its own: the logotype fades in and holds. */
export const OpenOnly: React.FC = () => <OpenTitle />;
