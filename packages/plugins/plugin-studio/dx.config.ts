//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.studio',
    name: 'Studio',
    author: 'DXOS',
    description: trim`
      Image is an image-creation tool for Composer. An ImageArtifact pairs an editable prompt with the
      images generated from it; the user authors the prompt, runs generation against a pluggable image-generation
      provider, and reviews the results one at a time or all together in a gallery.

      The plugin is provider-agnostic: it defines the ImageGenerationService abstraction and never talks to a
      specific image API. Concrete providers (such as plugin-ideogram) register an implementation and manage their
      own credentials via the Connector system; credentialed access is resolved at generation time through
      CredentialsService, keyed by the provider's source.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-studio',
    icon: { key: 'ph--paint-brush--regular', hue: 'purple' },
    spec: 'PLUGIN.mdl',
    screenshots: [],
    tags: ['labs'],
  },
});
