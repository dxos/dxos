//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/protocols';

export { Config2 } from '@dxos/protocols';

/**
 * Identity helper for authoring a typed `dx.config.ts`:
 * `export default defineConfig({ plugin: { … } })`. Validation runs when the config is loaded
 * (`Schema.decodeUnknownSync(Config2.Config)`), not here, so this stays a zero-cost type anchor.
 */
export const defineConfig = (config: Config2.Config): Config2.Config => config;
