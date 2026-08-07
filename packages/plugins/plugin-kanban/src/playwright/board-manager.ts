//
// Copyright 2024 DXOS.org
//

import { BoardManager as MosaicBoardManager } from '@dxos/react-ui-mosaic/playwright';

/** Story render budget, over the preset's 30s `actionTimeout` but inside this suite's 60s test timeout. */
const READY_TIMEOUT = 45_000;

export class BoardManager extends MosaicBoardManager {
  async waitUntilReady(): Promise<void> {
    // Explicit budget rather than the inherited `actionTimeout`: this waits on the story's first
    // paint, which the config already extends `timeout` to 60s for ("Stories are slow to start up"),
    // and the two waits disagreeing is what surfaced. Two webkit tests timed out here at exactly 30s
    // in run 31140999737 — with `workers: 1`, so it is the render being slow, not workers contending.
    await this.columns().first().waitFor({ state: 'visible', timeout: READY_TIMEOUT });
    await this.columns().nth(2).waitFor({ state: 'visible', timeout: READY_TIMEOUT });
    await this.column(1).items().first().waitFor({ state: 'visible', timeout: READY_TIMEOUT });
  }
}
