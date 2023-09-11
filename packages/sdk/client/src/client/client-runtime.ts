//
// Copyright 2023 DXOS.org
//

import type { SpaceList } from '../echo';
import type { HaloProxy } from '../halo';
import type { MeshProxy } from '../mesh';

export class ClientRuntime {
  public readonly spaces;
  public readonly halo;
  public readonly mesh;

  constructor({ spaces, halo, mesh }: { spaces: SpaceList; halo: HaloProxy; mesh: MeshProxy }) {
    this.spaces = spaces;
    this.halo = halo;
    this.mesh = mesh;
  }

  async open() {
    await this.mesh._open();
    await this.spaces._open();
    await this.halo._open();
  }

  async close() {
    await this.halo._close();
    await this.spaces._close();
    await this.mesh._close();
  }
}
