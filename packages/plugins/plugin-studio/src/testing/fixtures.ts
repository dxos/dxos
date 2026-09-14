//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref } from '@dxos/echo';

import { MediaArtifact, Variant } from '#types';

import { MOCK_PROVIDER_ID, mockImageUrl } from './mock-provider-plugin.ts';

export type MockArtifactProps = {
  db: Database.Database;
  name: string;
  /** Persisted as the artifact's request, and the seed of its cover when `generated`. */
  prompt: string;
  /** Seed one produced variant (the cover) so the artifact opens on a picture, not a placeholder. */
  generated?: boolean;
  /** Extra produced variants beyond the cover (each a different picsum seed). */
  count?: number;
  parent?: Obj.Unknown;
};

/**
 * A story artifact the way the mock provider would have made it: the prompt on the artifact's
 * `request` (so the compose form opens on it) and, when generated, variants whose pictures follow
 * the prompt through {@link mockImageUrl}.
 */
export const makeMockArtifact = ({ db, name, prompt, generated = false, count = 1, parent }: MockArtifactProps) => {
  const artifact = db.add(MediaArtifact.make({ name, kind: 'image', request: { prompt }, [Obj.Parent]: parent }));
  if (generated) {
    const variants = Array.from({ length: count }, (_, index) =>
      db.add(
        Variant.make({
          [Obj.Parent]: artifact,
          name: prompt,
          contentType: 'image/png',
          url: mockImageUrl(prompt, index),
          config: { prompt },
          generation: { provider: MOCK_PROVIDER_ID, prompt, seed: index },
        }),
      ),
    );
    Obj.update(artifact, (artifact) => {
      artifact.variants = variants.map((variant) => Ref.make(variant));
      artifact.cover = Ref.make(variants[0]);
    });
  }
  return artifact;
};
