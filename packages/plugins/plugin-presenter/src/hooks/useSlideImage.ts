//
// Copyright 2026 DXOS.org
//

import { useObject, useResolveRef } from '@dxos/echo-react';
import * as StudioHooks from '@dxos/plugin-studio/StudioHooks';

import { type Presentation } from '#types';

/**
 * The URL of a slide's image: its media artifact's cover variant (else its first), from the stored file once there is
 * one, else the provider's URL; undefined until generated.
 */
export const useSlideImage = (slide: Presentation.Slide | undefined): string | undefined => {
  const [image] = useObject(slide, 'image');
  const artifact = useResolveRef(image);
  const [cover] = useObject(artifact, 'cover');
  const [variants] = useObject(artifact, 'variants');
  const variant = useResolveRef(cover ?? variants?.[0]);
  const [url] = useObject(variant, 'url');
  const [content] = useObject(variant, 'content');
  return StudioHooks.useVariantSource(variant ? { url, content } : undefined);
};
