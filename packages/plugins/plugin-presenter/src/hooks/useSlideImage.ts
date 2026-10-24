//
// Copyright 2026 DXOS.org
//

import { useObject, useResolveRef } from '@dxos/echo-react';

import { type Presentation } from '#types';

/**
 * The URL of a slide's image: its media artifact's cover variant (else its first); undefined until generated.
 */
export const useSlideImage = (slide: Presentation.Slide | undefined): string | undefined => {
  const [image] = useObject(slide, 'image');
  const artifact = useResolveRef(image);
  const [cover] = useObject(artifact, 'cover');
  const [variants] = useObject(artifact, 'variants');
  const variant = useResolveRef(cover ?? variants?.[0]);
  const [url] = useObject(variant, 'url');
  return url;
};
