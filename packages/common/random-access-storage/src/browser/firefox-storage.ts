//
// Copyright 2021 DXOS.org
//

// NOTE: Removing the .js extension here breaks usage in create-react-app.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import raw from 'random-access-web/mutable-file-wrapper.js';

import { BrowserStorage } from './browser-storage';
import { StorageType } from '../common';

/**
 * Storage interface implementation for Firefox browser.
 * https://github.com/random-access-storage/random-access-web
 */
export class FirefoxStorage extends BrowserStorage {
  public override type: StorageType = StorageType.FIREFOX;

  protected override _createFileStorage(path: string) {
    return raw({ name: path });
  }
}
