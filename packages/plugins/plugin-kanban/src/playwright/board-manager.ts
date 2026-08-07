//
// Copyright 2024 DXOS.org
//

import { BoardManager as MosaicBoardManager } from '@dxos/react-ui-mosaic/playwright';

/** Story render budget, over the preset's 30s `actionTimeout` but inside this suite's test timeout. */
const READY_TIMEOUT = 90_000;

export class BoardManager extends MosaicBoardManager {
  async waitUntilReady(): Promise<void> {
    // Explicit budget rather than the inherited `actionTimeout`: this waits on the story's first
    // paint, which the config extends `timeout` for ("Stories are slow to start up"), and the two
    // waits disagreeing is what surfaced. Webkit has now hit the ceiling at each value it was given —
    // 30s in run 31140999737 (with `workers: 1`, so not worker contention) and 45s in 31146208557 —
    // while every other browser paints in a fraction of it. Since each failure is exactly the budget,
    // the evidence only ever says "at least this long"; 90s is high enough that a further failure
    // means the story is stuck rather than slow, which is the distinction worth buying.
    await this.columns().first().waitFor({ state: 'visible', timeout: READY_TIMEOUT });
    await this.columns().nth(2).waitFor({ state: 'visible', timeout: READY_TIMEOUT });
    await this.column(1).items().first().waitFor({ state: 'visible', timeout: READY_TIMEOUT });
  }
}
