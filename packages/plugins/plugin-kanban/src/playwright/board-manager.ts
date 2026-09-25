//
// Copyright 2024 DXOS.org
//

import { BoardManager as MosaicBoardManager } from '@dxos/react-ui-mosaic/playwright';

/** Budget for the story to boot and paint its first column; passing boots measure ~10-25s. */
const STORY_BOOT_TIMEOUT = 45_000;

/** Budget for the rest of the board once any column has painted — one render, not a boot. */
const RENDER_TIMEOUT = 5_000;

export class BoardManager extends MosaicBoardManager {
  async waitUntilReady(): Promise<void> {
    // Only the first wait spans the story boot; the board renders all columns in one pass, so once one
    // is visible the rest are a render away, not another boot.
    await this.columns().first().waitFor({ state: 'visible', timeout: STORY_BOOT_TIMEOUT });
    await this.columns().nth(2).waitFor({ state: 'visible', timeout: RENDER_TIMEOUT });
    await this.column(1).items().first().waitFor({ state: 'visible', timeout: RENDER_TIMEOUT });
  }
}
