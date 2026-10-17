//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { Composition, Folder } from 'remotion';

import { FormatId, FORMATS, FPS, SPOT_SECONDS, TIMING } from './brand.ts';
import { ComposerIntro } from './ComposerIntro.tsx';
import { PROVOCATIONS } from './provocations.ts';
import { EndOnly, OpenOnly, Spot10, Spot30 } from './Spots.tsx';
import { Trail } from './Trail.tsx';

const s10 = SPOT_SECONDS['10s'];
const s30 = SPOT_SECONDS['30s'];

// One composition per provocation x length x format, e.g. "P03-10s-16x9", plus the opening title, the close card and the DXOS trail alone, e.g. "OPEN-3s-16x9", "CLOSE-3s-16x9" and "TRAIL-8s-16x9".
export const RemotionRoot: React.FC = () => (
  <>
    {PROVOCATIONS.map((p) => (
      <Folder key={p.id} name={p.id}>
        {(Object.keys(FORMATS) as FormatId[]).map((f) => (
          <React.Fragment key={f}>
            <Composition
              id={`${p.id}-10s-${f}`}
              component={Spot10}
              durationInFrames={s10 * FPS}
              fps={FPS}
              width={FORMATS[f].width}
              height={FORMATS[f].height}
              defaultProps={{ provocationId: p.id }}
            />
            <Composition
              id={`${p.id}-30s-${f}`}
              component={Spot30}
              durationInFrames={s30 * FPS}
              fps={FPS}
              width={FORMATS[f].width}
              height={FORMATS[f].height}
              defaultProps={{ provocationId: p.id }}
            />
          </React.Fragment>
        ))}
      </Folder>
    ))}
    <Folder name='OPEN'>
      {(Object.keys(FORMATS) as FormatId[]).map((f) => (
        <Composition
          key={f}
          id={`OPEN-${TIMING.open.duration}s-${f}`}
          component={OpenOnly}
          durationInFrames={TIMING.open.duration * FPS}
          fps={FPS}
          width={FORMATS[f].width}
          height={FORMATS[f].height}
        />
      ))}
    </Folder>
    <Folder name='COMPOSER'>
      {(Object.keys(FORMATS) as FormatId[]).map((f) => (
        <Composition
          key={f}
          id={`COMPOSER-${TIMING.composer.duration}s-${f}`}
          component={ComposerIntro}
          durationInFrames={TIMING.composer.duration * FPS}
          fps={FPS}
          width={FORMATS[f].width}
          height={FORMATS[f].height}
        />
      ))}
    </Folder>
    <Folder name='TRAIL'>
      {(Object.keys(FORMATS) as FormatId[]).map((f) => (
        <Composition
          key={f}
          id={`TRAIL-${TIMING.trail.duration}s-${f}`}
          component={Trail}
          durationInFrames={TIMING.trail.duration * FPS}
          fps={FPS}
          width={FORMATS[f].width}
          height={FORMATS[f].height}
        />
      ))}
    </Folder>
    <Folder name='CLOSE'>
      {(Object.keys(FORMATS) as FormatId[]).map((f) => (
        <Composition
          key={f}
          id={`CLOSE-${TIMING.spot10.endCard}s-${f}`}
          component={EndOnly}
          durationInFrames={TIMING.spot10.endCard * FPS}
          fps={FPS}
          width={FORMATS[f].width}
          height={FORMATS[f].height}
        />
      ))}
    </Folder>
  </>
);
