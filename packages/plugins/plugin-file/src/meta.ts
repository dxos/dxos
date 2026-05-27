//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.file'),
  name: 'File',
  author: 'DXOS',
  description: trim`
    FilePlugin enables DXOS Composer to store and preview binary files — images, videos, and PDFs — as
    first-class ECHO objects. Uploaded bytes are routed through a pluggable backend system: the built-in
    inline backend serialises the file directly onto the ECHO document, while external backends (e.g. WNFS)
    can be contributed by other plugins.

    Accepted formats are images (jpg, jpeg, png, gif, webp, svg), videos (mp4, webm, mov), and PDFs,
    up to a 4 MB limit per file for the inline backend. The preview surface renders the appropriate HTML
    element for each MIME class and surfaces inside article, section, and slide roles.

    A UrlResolver capability lets external-storage backends convert opaque storage URIs into renderable
    blob, data, or HTTP URLs at view time, keeping the ECHO object schema backend-agnostic. A companion
    Markdown extension allows file objects to be embedded directly in Markdown documents.

    Backend selection is user-configurable in the plugin settings panel, which lists all registered
    backends with their descriptions. Selecting a backend persists the choice to the ECHO-backed settings
    atom so the preference is shared across devices.
  `,
  icon: 'ph--file--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-file',
  spec: 'PLUGIN.mdl',
};
