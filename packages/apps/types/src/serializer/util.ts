//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Factor out.
export class UniqueNames {
  private readonly _namesCount = new Map<string, number>();

  // TODO(burdon): Make unique by folder?
  // TODO(burdon): Use meta key for filename.
  unique(name = 'untitled') {
    if (this._namesCount.has(name)) {
      const count = this._namesCount.get(name)!;
      this._namesCount.set(name, count + 1);
      // TODO(burdon): Detect and replace current count (e.g., foo_1 => foo_2 not foo_1_1).
      //  Have to check doesn't collide with existing names.
      return `${name}_${count}`;
    } else {
      this._namesCount.set(name, 1);
      return name;
    }
  }
}
