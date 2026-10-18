//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { AbsoluteFill } from 'remotion';
// TODO(burdon): Restore once @dxos/hero is available in this repo.
// import { DXOSTrail } from '@dxos/hero/trail';

import { usePalette, withIdent } from './theme.tsx';

/**
 * The DXOS trail from @dxos/hero (fluid glow orbiting the mark), driven by the composition frame.
 * Use it as a full-frame layer, e.g. behind the end card or as a standalone ident.
 */
const TrailCard = () => {
  const colors = usePalette();
  // const frame = useCurrentFrame();
  // const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.ground }}>
      {/* <DXOSTrail frame={frame} fps={fps} /> */}
    </AbsoluteFill>
  );
};

export const Trail = withIdent(TrailCard);
