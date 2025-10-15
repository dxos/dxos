//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';

import { type ObjectId } from '@dxos/echo/internal';
import { type ObjectVersion } from '@dxos/echo-db';

/**
 * Resolves artifact ids to their versions.
 * Used to give the model a sense of the changes to the artifacts made by users during the conversation.
 * The artifacts versions are pinned in the history, and whenever the artifact changes in-between assistant's steps,
 * a diff is inserted into the conversation.
 *
 * Can be optionally provided to the session run call.
 */
// TODO(dmaretskyi): Convert to Context.Reference
export class ArtifactDiffResolver extends Context.Tag('@dxos/assistant/ArtifactDiffResolver')<
  ArtifactDiffResolver,
  ArtifactDiffResolver.Service
>() {}

export namespace ArtifactDiffResolver {
  export type Service = {
    resolve: (
      artifacts: {
        id: ObjectId;
        lastVersion: ObjectVersion;
      }[],
    ) => Promise<
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
