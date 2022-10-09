//
// Copyright 2021 DXOS.org
//

import randomAccessMutable from 'random-access-web/mutable-file-wrapper';

import { StorageType } from '../common';
import { BrowserStorage } from './browser-storage';

/**
 * Storage interface implementation for Firefox browser
 */
export class FirefoxStorage extends BrowserStorage {
  public override type: StorageType = StorageType.FIREFOX;

  protected override _createFileStorage (path: string) {
    return randomAccessMutable({ name: path });
  }
}
