//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

import { readComposerConfig, writeComposerConfig } from '../../util';

import type { FilesystemWorkspace } from '../../types';

const FILESYSTEM_MIRROR_TAG = 'org.dxos.space.filesystem-mirror';

/** Manages the creation and lookup of mirror ECHO spaces for filesystem workspaces. */
export class MirrorSpaceManager {
  private readonly _spaceByWorkspaceId = new Map<string, Space>();

  constructor(private readonly _client: Client) {}

  /** Get an existing mirror space or create a new one for the given workspace. */
  getOrCreateSpace(workspace: FilesystemWorkspace): Effect.Effect<Space> {
    return Effect.gen(this, function* () {
      const cached = this._spaceByWorkspaceId.get(workspace.id);
      if (cached) {
        return cached;
      }

      const config = yield* readComposerConfig(workspace.path);
      if (config.spaceId) {
        const existing = this._client.spaces.get().find((space) => space.id === config.spaceId);
        if (existing) {
          this._spaceByWorkspaceId.set(workspace.id, existing);
          return existing;
        }

        log.warn('Mirror space not found, creating new one', {
          workspaceId: workspace.id,
          staleSpaceId: config.spaceId,
        });
        yield* writeComposerConfig(workspace.path, { ...config, spaceId: undefined });
      }

      const space = yield* Effect.promise(() =>
        this._client.spaces.create({}, { tags: [FILESYSTEM_MIRROR_TAG], membershipPolicy: MembershipPolicy.LOCKED }),
      );
      yield* Effect.promise(() => space.waitUntilReady());

      const currentConfig = yield* readComposerConfig(workspace.path);
      yield* writeComposerConfig(workspace.path, { ...currentConfig, spaceId: space.id });

      this._spaceByWorkspaceId.set(workspace.id, space);
      return space;
    });
  }

  /** Lookup the mirror space for a workspace, returning None if not yet created. */
  getSpaceForWorkspace(workspaceId: string): Option.Option<Space> {
    const space = this._spaceByWorkspaceId.get(workspaceId);
    return space ? Option.some(space) : Option.none();
  }
}
