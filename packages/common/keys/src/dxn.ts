import { invariant } from '@dxos/invariant';

export class DXN {
  static parse(dxn: string): DXN {
    const [prefix, kind, ...parts] = dxn.split(':');
    if (!(prefix === 'dxn')) throw new Error('Invalid DXN');
    if (!(typeof kind === 'string' && kind.length > 0)) throw new Error('Invalid DXN');
    if (!(parts.length > 0)) throw new Error('Invalid DXN');
    return new DXN(kind, parts);
  }

  #kind: string;
  #parts: string[];

  constructor(kind: string, parts: string[]) {
    invariant(parts.length > 1);
    this.#kind = kind;
    this.#parts = parts;
  }

  get kind() {
    return this.#kind;
  }

  get parts() {
    return this.#parts;
  }
}
