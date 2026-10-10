import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

import { DXOSTrail } from '@dxos/hero/trail';

import { COLORS } from './brand';

/**
 * The DXOS trail from @dxos/hero (fluid glow orbiting the mark), driven by the composition frame.
 * Use it as a full-frame layer, e.g. behind the end card or as a standalone ident.
 */
export const Trail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ground }}>
      <DXOSTrail frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
