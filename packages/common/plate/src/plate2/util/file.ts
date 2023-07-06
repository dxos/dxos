//
// Copyright 2023 DXOS.org
//

import mkdirp from 'mkdirp';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { Effect } from './effect';
import { fileExists } from './fileExists';
import { Slot, Slots, Context, RenderedSlots } from './template';

export type Path = string;

export type FileSlots<
  I = any,
  TSlots extends Slots<I> = {},
  TContext extends Context<I, TSlots> = Context<I, TSlots>,
> = {
  path?: Slot<Path, I, TSlots, TContext>;
  content?: Slot<string | undefined | null | false, I, TSlots, TContext>;
  copyOf?: Slot<string, I, TSlots, TContext>;
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
