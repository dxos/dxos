//
// Copyright 2023 DXOS.org
//

import { promises as fs } from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

import { Effect } from './effect';
import { fileExists } from './fileExists';
import { Slot, Slots, RenderedSlots } from './template';

export type Path = string;

export type FileSlots<I = any, TSlots extends Slots<I> = {}> = {
  path?: Slot<Path, I, TSlots>;
  content?: Slot<string | undefined, I, TSlots>;
  copyOf?: Slot<string, I, TSlots>;
};

export class FileEffect implements Effect<{ overwrite?: boolean }> {
  public path: Path = '';
  public content = '';
  public copyOf?: string;

  static isFileEffect = (o: any): o is FileEffect => {
    return o?.path && o?.content;
  };

  constructor(private readonly slots: RenderedSlots<FileSlots>) {
    Object.assign(this, slots);
  }

  async apply({ overwrite = false }) {
    if (!overwrite) {
      const exists = await fileExists(this.path);
      if (exists) {
        return undefined;
      }
    }
    if (this.copyOf) {
      await mkdirp(path.dirname(this.path));
      await fs.copyFile(this.copyOf!, this.path);
      return this;
    } else {
      if (!this.content) {
        return undefined;
      }
      await mkdirp(path.dirname(this.path));
      await fs.writeFile(this.path, this.content);
      return this;
    }
  }
}
