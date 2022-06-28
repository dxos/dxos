//
// Copyright 2022 DXOS.org
//

import raf from 'random-access-file';

import { File } from '../interfaces';
import { AbstractDirectory } from './abstract-directory';

export class NodeDirectory extends AbstractDirectory {
  _create (filename: string, opts: any = {}): File {
    return new File(raf(filename, {
      directory: this._path,
      ...opts
    }));
  }
}
