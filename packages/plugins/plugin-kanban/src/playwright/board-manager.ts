//
// Copyright 2024 DXOS.org
//

import { BoardManager as MosaicBoardManager } from '@dxos/react-ui-mosaic/playwright';

export class BoardManager extends MosaicBoardManager {
  async waitUntilReady(): Promise<void> {
    await this.columns().first().waitFor({ state: 'visible' });
    await this.columns().nth(2).waitFor({ state: 'visible' });
    await this.column(1).items().first().waitFor({ state: 'visible' });
  }
}
