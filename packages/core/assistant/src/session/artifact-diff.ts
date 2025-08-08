//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import { type ObjectVersion } from '@dxos/echo-db';
import { type ObjectId } from '@dxos/echo-schema';

/**
 * Resolves artifact ids to their versions.
 * Used to give the model a sense of the changes to the artifacts made by users during the conversation.
 * The artifacts versions are pinned in the history, and whenever the artifact changes in-between assistant's steps,
 * a diff is inserted into the conversation.
 *
 * Can be optionally provided to the session run call.
 */
// TODO(burdon): Move.
// TODO(dmaretskyi): Convert to Context.Reference
export class ArtifactDiffResolver extends Context.Tag('@dxos/assistant/ArtifactDiffResolver')<
  ArtifactDiffResolver,
  ArtifactDiffResolver.Service
>() {}

export namespace ArtifactDiffResolver {
  export type Service = {
    resolve: (artifacts: { id: ObjectId; lastVersion: ObjectVersion }[]) => Promise<
      Map<
        ObjectId,
        {
          version: ObjectVersion;
          diff?: string;
        }
      >
    >;
  };
}
