//
// Copyright 2025 DXOS.org
//

import { linkedSegment } from '@dxos/react-ui-attention';

/** Companion node id segment for the fullscreen presentation surface. */
export const GALLERY_SHOW_SEGMENT = 'gallery-show';

/** Canonical qualified path to the gallery show companion node for an object. */
export const getGalleryShowPath = (objectPath: string): string =>
  `${objectPath}/${linkedSegment(GALLERY_SHOW_SEGMENT)}`;
