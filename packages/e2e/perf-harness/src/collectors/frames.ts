//
// Copyright 2026 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type Cdp } from '../cdp.ts';

/**
 * A frame gap longer than this counts as visible lag.
 *
 * Chromium's screencast emits a frame only when the surface changes, so an idle page produces no
 * frames and every idle gap would read as a stall. The threshold therefore only means something
 * inside a stage that is driving the UI, which is why gaps are cut per stage rather than summed
 * over the run.
 */
const STILL_FRAME_MS = 200;

export type StillFrames = { maxMs: number; count: number; files: string[] };

export type Screencast = {
  /** Names the stills that follow after the stage they belong to. */
  beginStage: (label: string) => void;
  /** Ends the stage, returning its still-frame summary. */
  endStage: () => StillFrames;
  stop: () => void;
};

/**
 * Starts a screencast that records inter-frame gaps and writes each stage's first and last frame.
 *
 * One mechanism for two deliverables: frame timestamps are the only measurement of what the SCREEN
 * did rather than what the event loop did, and the same frames are the between-stage screenshots.
 * Diagnose mode only — an attached screencast is itself a perturbation.
 */
export const startScreencast = async (page: Cdp, outputDir: string): Promise<Screencast> => {
  mkdirSync(outputDir, { recursive: true });

  let label = 'unstarted';
  let gaps: number[] = [];
  let files: string[] = [];
  let lastFrameAt: number | undefined;
  let framesThisStage = 0;

  const onFrame = ({ data, sessionId }: { data: string; sessionId: number }) => {
    const now = Date.now();
    if (lastFrameAt !== undefined) {
      const gap = now - lastFrameAt;
      if (gap > STILL_FRAME_MS) {
        gaps.push(gap);
      }
    }
    lastFrameAt = now;

    // First and last only: a stage at 10 fps is hundreds of PNGs, and the pair is what a reviewer
    // compares. `last` is overwritten as frames arrive, so it ends as the stage's final state.
    const which = framesThisStage === 0 ? 'first' : 'last';
    const file = path.join(outputDir, `${label}-${which}.png`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    if (!files.includes(file)) {
      files.push(file);
    }
    framesThisStage += 1;

    // Chromium sends no further frames until the previous one is acknowledged.
    void page.trySend('Page.screencastFrameAck', { sessionId });
  };

  page.on('Page.screencastFrame', onFrame);
  await page.trySend('Page.enable');
  await page.trySend('Page.startScreencast', { format: 'png', quality: 60, everyNthFrame: 1 });

  return {
    beginStage: (stageLabel: string): void => {
      label = stageLabel;
      gaps = [];
      files = [];
      framesThisStage = 0;
      // `lastFrameAt` deliberately survives the boundary: the interval spanning it is real time in
      // which the screen did not update.
    },
    endStage: (): StillFrames => ({
      maxMs: Math.round(Math.max(0, ...gaps)),
      count: gaps.length,
      files,
    }),
    stop: () => {
      page.off('Page.screencastFrame', onFrame);
      void page.trySend('Page.stopScreencast');
    },
  };
};
