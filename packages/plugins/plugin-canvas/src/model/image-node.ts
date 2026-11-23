//
// Copyright 2026 DXOS.org
//

//
// The canvas's image shape: a picture linked by URL, scaled into the node's frame. The URL is the node's own data, so
// a drawing keeps a reference to the picture rather than a copy of it.
//

import * as Schema from 'effect/Schema';

import { type NodeBase, nodeBase } from '@dxos/scene';

/** How the picture fills the frame: whole inside it, covering it (cropped), or stretched to it. */
export const IMAGE_FITS = ['contain', 'cover', 'fill'] as const;

export const ImageNode = Schema.Struct({
  type: Schema.Literal('image'),
  ...nodeBase,
  /** The linked picture. */
  src: Schema.optional(Schema.String.annotate({ title: 'URL', description: 'Link to the image (https://…)' })),
  /** What the picture shows, for those who cannot see it. */
  alt: Schema.optional(Schema.String.annotate({ title: 'Description' })),
  fit: Schema.optional(Schema.Literals(IMAGE_FITS).annotate({ title: 'Fit' })),
});
export type ImageNode = Schema.Schema.Type<typeof ImageNode>;

export const isImageNode = (node: NodeBase): node is ImageNode => node.type === 'image';

/** Only web links are drawn: a `javascript:` or `data:` URL in shared data is not followed. */
export const imageUrl = (src: string | undefined): string | undefined => {
  if (!src) {
    return undefined;
  }
  try {
    const url = new URL(src);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
};
