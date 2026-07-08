//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.file',
    name: 'File',
    author: 'DXOS',
    description: trim`
      FilePlugin enables DXOS Composer to store and preview binary files — images, videos, and PDFs — as
      first-class ECHO objects. Uploaded bytes are routed through a pluggable backend system: the built-in
      inline backend serialises the file directly onto the ECHO document, while external backends (e.g. WNFS)
      can be contributed by other plugins.

      Accepted formats are images (jpg, jpeg, png, gif, webp, svg), videos (mp4, webm, mov), and PDFs,
      up to a 4 MB limit per file for the inline backend (other backends scale beyond it). The preview
      surface renders the appropriate HTML element for each MIME class and surfaces inside article,
      section, and slide roles.

      A File object's \`data\` field is a reference to a \`Blob\` ECHO object (from \`@dxos/echo\`), which
      abstracts where bytes actually live. \`Blob.url\`/\`Blob.read\` resolve a renderable URL or the raw
      bytes regardless of backend, keeping the File object schema backend-agnostic without a separate
      URL-resolver capability. A companion Markdown extension allows file objects to be embedded directly
      in Markdown documents.

      Backend selection is user-configurable in the plugin settings panel, which lists all registered
      backends with their descriptions. Selecting a backend persists the choice to the ECHO-backed settings
      atom so the preference is shared across devices.
    `,
    icon: { key: 'ph--file--regular', hue: 'indigo' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-file',
    spec: 'PLUGIN.mdl',
  },
});
