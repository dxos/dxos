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
      Studio is a creative-artifact tool for Composer. An Artifact is a media-agnostic unit of creative work — a
      prompt paired with the variants generated (or uploaded) from it — spanning images, video, and future media,
      discriminated by an open-string kind. The user authors the prompt, runs generation against a pluggable,
      kind-specific provider, and reviews the variants one at a time, all together in a gallery, or as cards.

      The plugin owns the cross-cutting ontology (Artifact / Variant / Generation) and the generic authoring UI;
      concrete media plug in as overridable renderer Surfaces (keyed by contentType) and providers register a
      GenerationService per kind (each with its own request schema). Providers such as plugin-ideogram manage their
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
