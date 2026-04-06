//
// Copyright 2023 DXOS.org
//

import { type Context } from '@dxos/context';

import type { SpaceList } from '../echo/space-list';
import type { HaloProxy } from '../halo/halo-proxy';
import type { MeshProxy } from '../mesh/mesh-proxy';
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

  async open(ctx: Context): Promise<void> {
    await this.mesh._open();
    await this.spaces._open(ctx);
    await this.halo._open();
  }

  async close(ctx: Context): Promise<void> {
    await this.halo._close();
    await this.spaces._close(ctx);
    await this.mesh._close();
  }
}
