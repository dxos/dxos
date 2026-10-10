import React from 'react';
import { Composition, Folder } from 'remotion';

import { FORMATS, FPS, FormatId, TIMING } from './brand';
import { PROVOCATIONS } from './provocations';
import { EndOnly, OpenOnly, Spot10, Spot30 } from './Spots';
import { Trail } from './Trail';

const s10 = TIMING.spot10.provocation + TIMING.spot10.endCard;
const s30 = TIMING.spot30.provocation + TIMING.spot30.turn + TIMING.spot30.resolve + TIMING.spot30.endCard;

// One composition per provocation x length x format, e.g. "P03-10s-16x9", plus the opening title, the end card and the DXOS trail alone, e.g. "OPEN-3s-16x9", "END-3s-16x9" and "TRAIL-8s-16x9".
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
    <Folder name='END'>
      {(Object.keys(FORMATS) as FormatId[]).map((f) => (
        <Composition
          key={f}
          id={`END-${TIMING.spot10.endCard}s-${f}`}
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
