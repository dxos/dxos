//
// Copyright 2025 DXOS.org
//

import { type OAuthProvider } from '@dxos/protocols';

/**
 * Shape of an OAuth flow descriptor used by the CLI and the
 * `oauth/` helpers. Matches the runtime OAuth spec carried on a
 * `Connector` entry's `oauth` plus a label/source for display.
 *
 * Connector lookup at runtime goes through the contributed `Connector`
 * capabilities; this type is kept only so the non-React OAuth helpers
 * (Tauri/mobile/CLI flows) can stay generic.
 *
 * @deprecated Use the `Connector` capabilities instead.
 */
export type OAuthPreset = {
  label: string;
  source: string;
  provider: OAuthProvider;
  scopes: string[];
};
