//
// Copyright 2023 DXOS.org
//

import type { SpaceList } from '../echo';
import type { HaloProxy } from '../halo';
import type { MeshProxy } from '../mesh';
import type { Shell } from '../services';

export class ClientRuntime {
  readonly spaces: SpaceList;
  readonly halo: HaloProxy;
  readonly mesh: MeshProxy;
  readonly shell?: Shell;

  constructor({ spaces, halo, mesh, shell }: { spaces: SpaceList; halo: HaloProxy; mesh: MeshProxy; shell?: Shell }) {
    this.spaces = spaces;
    this.halo = halo;
    this.mesh = mesh;
    this.shell = shell;
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
