//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { type Variant } from '#types';

import { useVariantSource } from './useVariantSource';

/** The subset of an Artifact needed to resolve its cover thumbnail (live object or snapshot). */
export type ArtifactCoverLike = {
  cover?: Ref.Ref<Variant.Variant>;
  variants?: ReadonlyArray<Ref.Ref<Variant.Variant>>;
};

/** Resolves an Artifact's thumbnail `src`: its cover variant (else its first variant). */
export const useArtifactCoverSource = (artifact?: ArtifactCoverLike): string | undefined => {
  const coverRef = artifact?.cover ?? artifact?.variants?.[0];
  const key = coverRef?.uri;
  const [variant, setVariant] = useState<Variant.Variant>();
  useEffect(() => {
    if (!coverRef) {
      setVariant(undefined);
      return;
    }
    let cancelled = false;
    void coverRef
      .load()
      .then((loaded) => {
        if (!cancelled) {
          setVariant(loaded);
        }
      })
      .catch((err) => log.catch(err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return useVariantSource(variant);
};
