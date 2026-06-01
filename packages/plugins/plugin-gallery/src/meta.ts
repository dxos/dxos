//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.gallery', '0.8.3'),
  name: 'Gallery',
  author: 'DXOS',
  description: trim`
    GalleryPlugin is a lightweight image gallery for DXOS Composer. A Gallery is
    an ECHO object that stores an ordered array of images, where each image
    carries a URL (either an external https:// address or a wnfs:// URL backed by
    the WNFS file-uploader plugin), an optional MIME type, file name, caption,
    and pixel dimensions. Galleries are first-class workspace objects and appear
    in the navtree alongside documents and other content types.

    Adding images is handled through the toolbar's Add button, which opens a file
    picker restricted to image MIME types. Selected files are uploaded via the
    registered FileUploader capability (WNFS) and the resulting URL is appended
    to the gallery. The Add button is automatically disabled when no FileUploader
    capability is present, so the plugin degrades gracefully in environments
    without file-storage support.

    Images are displayed as cards in a responsive Masonry grid. Each card renders
    the image as a poster with a delete affordance that removes the image from the
    gallery on confirmation. A fullscreen Show mode fills the viewport with the
    masonry layout via plugin-deck's solo--fullscreen adjustment, opening the
    GalleryShow companion surface for distraction-free presentation.

    The plugin also exposes a describeImage operation that generates a textual
    description for any image and writes it to the image's description field,
    providing a foundation for AI-assisted alt-text and caption generation as
    the platform's image-to-text capabilities mature.
  `,
  icon: 'ph--images--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-gallery',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
});
