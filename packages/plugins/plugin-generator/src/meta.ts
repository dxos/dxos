//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.generator'),
  name: 'Generator',
  author: 'DXOS',
  description: trim`
    Generator adds AI-driven media production to Composer. A Generation object
    pairs a markdown prompt (stored as a linked Text ref so it replicates to
    peers) with a media kind (video or audio) and optional provider-specific
    avatar and voice identifiers. The article surface presents an inline
    markdown editor above a video or audio player that appears as soon as the
    generation completes, so the full author-to-playback workflow lives in a
    single view.

    Media is produced by a pluggable GenerationProvider abstraction. The
    default implementation calls the HeyGen API: it submits the prompt via
    POST /v2/video/generate then polls the status endpoint until the job
    completes or fails, returning the final media URL. The provider interface
    also exposes listAvatars and listVoices so the UI can populate pickers from
    live provider data. The abstraction is intentionally provider-agnostic:
    backends such as Veo, Sora, or ElevenLabs can be added without changing the
    Generation data model or the article surface.

    The API key is stored in local plugin settings (scoped to the plugin id in
    KVS) and read reactively so toggling a key in the settings panel enables or
    disables the Generate button without a page reload. When the key is missing
    the generate operation returns a structured MissingApiKey error that the
    article surfaces inline; when the provider returns an error the article
    shows it in the status bar without modifying the stored URL.

    Generation objects are full ECHO citizens: they are queryable from Table
    views, replicable to collaborators in the same space, and addressable by
    DXN. The underlying Text prompt replicates independently so multiple users
    can edit the prompt while the generation result is still pending.
  `,
  icon: 'ph--film-reel--regular',
  iconHue: 'fuchsia',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-generator',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['labs'],
};
