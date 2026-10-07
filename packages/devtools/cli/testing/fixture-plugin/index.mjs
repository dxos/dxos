//
// Copyright 2026 DXOS.org
//

// Stands in for a published third-party plugin: a bundle whose default export is the factory
// `Plugin.make` produces, importing `@dxos/app-framework` as a bare specifier the way a community
// plugin does. Its meta is derived the same way an in-repo plugin derives it from `dx.config.ts`.
import * as Plugin from '@dxos/app-framework/Plugin';

const meta = Plugin.getMetaFromConfig({
  plugin: {
    key: 'com.example.plugin.fixture',
    name: 'Fixture Plugin',
    description: "A third-party plugin used by the CLI's install tests.",
    tags: ['alpha'],
  },
});

export default Plugin.make(Plugin.define(meta));
