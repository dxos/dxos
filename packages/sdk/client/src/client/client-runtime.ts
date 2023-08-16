//
// Copyright 2023 DXOS.org
//

import type { EchoProxy } from '../echo';
import type { HaloProxy } from '../halo';
import type { MeshProxy } from '../mesh';

export class ClientRuntime {
  public readonly echo;
  public readonly halo;
  public readonly mesh;

  constructor({ echo, halo, mesh }: { echo: EchoProxy; halo: HaloProxy; mesh: MeshProxy }) {
    this.echo = echo;
    this.halo = halo;
    this.mesh = mesh;
  }

  async open() {
    await this.mesh._open();
    await this.echo.open();
    await this.halo._open();
  }

  async close() {
    await this.halo._close();
    await this.echo.close();
    await this.mesh._close();
  }
}
