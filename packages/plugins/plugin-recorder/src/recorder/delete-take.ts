//
// Copyright 2026 DXOS.org
//

import { Obj, type Ref } from '@dxos/echo';
import type * as MediaArtifact from '@dxos/plugin-studio/MediaArtifact';
import type * as Variant from '@dxos/plugin-studio/Variant';

/**
 * Removes a take from its artifact and deletes it (and the file it owns); the newest remaining take becomes the
 * cover when the deleted one was.
 */
export const deleteTake = (artifact: MediaArtifact.MediaArtifact, variant: Variant.Variant): void => {
  // A ref's URI may omit the space a live object's URI carries, so the object id decides.
  const sameTake = (ref: Ref.Ref<Variant.Variant>) => ref.uri.endsWith(`/${variant.id}`);
  Obj.update(artifact, (artifact) => {
    artifact.variants = (artifact.variants ?? []).filter((ref) => !sameTake(ref));
    if (artifact.cover && sameTake(artifact.cover)) {
      artifact.cover = artifact.variants.at(-1);
    }
  });
  Obj.getDatabase(variant)?.remove(variant);
};
