//
// Copyright 2025 DXOS.org
//

import { type OAuthProvider } from '@dxos/protocols';

/**
 * Shape of an OAuth flow descriptor used by the CLI and the
 * `oauth/` helpers. Matches the runtime `IntegrationOAuthSpec` carried on
 * `IntegrationProvider.oauth` plus a label/source for display.
 *
 * Provider lookup at runtime goes through the contributed
 * `IntegrationProvider` capabilities; this type is kept only so the
 * non-React OAuth helpers (Tauri/mobile/CLI flows) can stay generic.
 */
export type OAuthPreset = {
  label: string;
  source: string;
  provider: OAuthProvider;
  scopes: string[];
};
