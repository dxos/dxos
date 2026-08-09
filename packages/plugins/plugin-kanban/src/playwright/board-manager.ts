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
    // Only the first wait spans the story boot (compile + module graph + client + space). The board
    // renders its columns and their items in one pass, so once any column is visible the rest are a
    // render away — giving them the boot budget too would turn a genuinely missing column into a
    // 45s stall three times over.
    await this.columns().first().waitFor({ state: 'visible', timeout: STORY_BOOT_TIMEOUT });
    await this.columns().nth(2).waitFor({ state: 'visible', timeout: RENDER_TIMEOUT });
    await this.column(1).items().first().waitFor({ state: 'visible', timeout: RENDER_TIMEOUT });
  }
}
