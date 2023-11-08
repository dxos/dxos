//
// Copyright 2023 DXOS.org
//

import mkdirp from 'mkdirp';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { type Effect } from './effect';
import { fileExists } from './fileExists';
import { type Slot, type Slots, type Context, type SlotValues, type FileApplyResult } from './template';

export type Path = string;

export const ellipsis = (s: string, n = 50) =>
  s?.length > n ? s.slice(0, n / 2 - 3) + '...' + s.slice(s.length - n / 2 - 3) : s;

export const kib = (bytes: number) => (bytes < 1024 ? `${bytes}B` : `${Math.round(bytes / 1024)}KiB`);

export const relative = (to: string, from: string = process.cwd()) => path.relative(from, to);

export type FileSlots<
  I = any,
  TSlots extends Slots<I> = {},
  TContext extends Context<I, TSlots> = Context<I, TSlots>,
> = {
  path?: Slot<Path, I, TSlots, TContext>;
  content?: Slot<string | undefined | null | false, I, TSlots, TContext>;
  copyOf?: Slot<string, I, TSlots, TContext>;
};

export class FileEffect implements Effect<{ overwrite?: boolean }, FileApplyResult> {
  public path: Path = '';
  public content = '';
  public copyOf?: string;

  static isFileEffect = (o: any): o is FileEffect => {
    return o?.path && o?.content;
  };

  constructor(private readonly slots: SlotValues<FileSlots>) {
    Object.assign(this, slots);
  }

  async apply(options?: { overwrite?: boolean }) {
    const { overwrite } = { overwrite: false, ...options };
    if (!overwrite) {
      const exists = await fileExists(this.path);
      if (exists) {
        return { filesWritten: 0 };
      }
    }
    if (this.copyOf) {
      await mkdirp(path.dirname(this.path));
      await fs.copyFile(this.copyOf!, this.path);
      return { filesWritten: 1 };
    } else {
      if (!this.content) {
        return { filesWritten: 0 };
      }
      await mkdirp(path.dirname(this.path));
      await fs.writeFile(this.path, this.content);
      return { filesWritten: 1 };
    }
  }

  toString() {
    // const PREVIEW_CONTENT = 150;
    return [
      this.copyOf ? 'copy:' : 'file:',
      this.path ? ellipsis(relative(this.path)) : '',
      this.copyOf ? 'from ' + ellipsis(relative(this.copyOf)) : '',
      this.content ? kib(this.content.length) : '',
    ].join('\t');
    // (this.content
    //   ? '\n' +
    //     chalk.gray(this.content.slice(0, PREVIEW_CONTENT)) +
    //     (this.content.length > PREVIEW_CONTENT ? ' ...' : '')
    //   : '')
  }
}
