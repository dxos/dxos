//
// Copyright 2023 DXOS.org
//

import { Monitor } from '../diagnostics';
import type { EchoProxy } from '../echo';
import type { HaloProxy } from '../halo';
import type { MeshProxy } from '../mesh';

export class ClientRuntime {
  public readonly monitor: Monitor;
  public readonly echo;
  public readonly halo;
  public readonly mesh;

  constructor({ monitor, echo, halo, mesh }: { monitor: Monitor; echo: EchoProxy; halo: HaloProxy; mesh: MeshProxy }) {
    this.monitor = monitor;
    this.echo = echo;
    this.halo = halo;
    this.mesh = mesh;
  }

  async open() {
    await this.monitor.open();
    await this.mesh._open();
    await this.echo.open();
    await this.halo._open();
  }

  async close() {
    await this.halo._close();
    await this.echo.close();
    await this.mesh._close();
    await this.monitor.close();
  }
}
