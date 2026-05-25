//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type FileCapabilities } from '@dxos/plugin-file/types';

export const Backend: Capability.LazyCapability<
  void,
  Capability.Capability<Capability.InterfaceDef<FileCapabilities.Backend>>
> = Capability.lazy('Backend', () => import('./backend'));

export const Blockstore = Capability.lazy('Blockstore', () => import('./blockstore'));

export const UrlResolver: Capability.LazyCapability<
  void,
  Capability.Capability<Capability.InterfaceDef<FileCapabilities.UrlResolver>>
> = Capability.lazy('UrlResolver', () => import('./url-resolver'));
