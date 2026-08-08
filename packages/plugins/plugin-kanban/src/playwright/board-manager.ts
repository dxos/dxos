//
// Copyright 2024 DXOS.org
//

import { BoardManager as MosaicBoardManager } from '@dxos/react-ui-mosaic/playwright';

/** Story render budget: passing boots paint in ~10-25s on every browser; see the note below. */
const READY_TIMEOUT = 45_000;

export class BoardManager extends MosaicBoardManager {
  async waitUntilReady(): Promise<void> {
    // The webkit "slow boot" failures this wait kept absorbing were never slowness: `storybook dev`
    // module graphs evaluate in arrival order, and the losing order entered an import cycle
    // mid-evaluation (`ReferenceError: Cannot access 'makeSpaceService' before initialization`),
    // which storybook's error boundary swallows into an eternally "preparing" story. The
    // `.storybook/preview.mts` preload pins the cycle's entry point, so a boot that misses this
    // budget is genuinely stuck, not racing.
    await this.columns().first().waitFor({ state: 'visible', timeout: READY_TIMEOUT });
    await this.columns().nth(2).waitFor({ state: 'visible', timeout: READY_TIMEOUT });
    await this.column(1).items().first().waitFor({ state: 'visible', timeout: READY_TIMEOUT });
  }
}
