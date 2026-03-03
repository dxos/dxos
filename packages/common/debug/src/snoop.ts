//
// Copyright 2022 DXOS.org
//

/* eslint-disable no-console */

export enum SnoopLevel {
  DEFAULT = 0,
  VERBOSE = 1,
  BOLD = 2,
}

/**
 * Utils for debug logging of functions.
 */
// TODO(burdon): Integrate with log/spyglass.
export class Snoop {
  static stackFunction(err: Error): string | undefined {
    const stack = err.stack!.split('\n');
    const match = stack[2].match(/.+\((.+)\).*/);
    if (match) {
      const [file, line] = match[1].split(':');
      return `[${file.substring(file.lastIndexOf('/') + 1)}:${line}]`;
    }
  }

  constructor(private readonly _context?: string) {}

  get verbose() {
    return SnoopLevel.VERBOSE;
  }

  get bold() {
    return SnoopLevel.BOLD;
  }

  format(prefix: string, name: string, args: string, level: SnoopLevel): string {
    const pre = prefix.repeat(level === SnoopLevel.BOLD ? 8 : 2);
    const label = this._context ? `${this._context}.${name}` : name;
    const line = `${pre} ${label}${args}`;
    return level === SnoopLevel.BOLD ? [pre, line, pre].join('\n') : line;
  }

  in(label: string, level: SnoopLevel, ...args: any[]): string {
    return this.format('<', label, level === SnoopLevel.DEFAULT ? '' : `(${String(...args)})`, level);
  }

  out(label: string, level: SnoopLevel, result: any): string {
    return this.format('>', label, level === SnoopLevel.DEFAULT ? '' : ` = ${String(result)}`, level);
  }

  sync(f: any, label?: string, level: SnoopLevel = SnoopLevel.VERBOSE) {
    label = label ?? Snoop.stackFunction(new Error());
    return (...args: any[]) => {
      console.log(this.in(label ?? '', level, ...args));
      const r = f(...args);
      console.log(this.out(label ?? '', level, r));
      return r;
    };
  }

  async(f: any, label?: string, level: SnoopLevel = SnoopLevel.VERBOSE) {
    label = label ?? Snoop.stackFunction(new Error());
    return async (...args: any[]) => {
      console.log(this.in(label ?? '', level, ...args));
      const r = await f(...args);
      console.log(this.out(label ?? '', level, r));
      return r;
    };
  }
}

export const snoop = new Snoop();
