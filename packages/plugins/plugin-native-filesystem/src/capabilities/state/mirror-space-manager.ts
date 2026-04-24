//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

import type { FilesystemWorkspace } from '#types';

import { readComposerConfig, writeComposerConfig } from '../../util';

const FILESYSTEM_MIRROR_TAG = 'org.dxos.space.filesystem-mirror';

/** Manages the creation and lookup of mirror ECHO spaces for filesystem workspaces. */
export class MirrorSpaceManager {
  private readonly _spaceByWorkspaceId = new Map<string, Space>();
  private readonly _inFlight = new Map<string, Promise<Space>>();

  constructor(private readonly _client: Client) {}

  /** Get an existing mirror space or create a new one for the given workspace. */
  getOrCreateSpace(workspace: FilesystemWorkspace): Effect.Effect<Space> {
    return Effect.promise(() => this._getOrCreateSpaceAsync(workspace));
  }

  private async _getOrCreateSpaceAsync(workspace: FilesystemWorkspace): Promise<Space> {
    const cached = this._spaceByWorkspaceId.get(workspace.id);
    if (cached) {
      return cached;
    }

    // Serialize concurrent callers for the same workspace.
    const pending = this._inFlight.get(workspace.id);
    if (pending) {
      return pending;
    }

    const promise = this._doCreateSpace(workspace).finally(() => {
      this._inFlight.delete(workspace.id);
    });
    this._inFlight.set(workspace.id, promise);
    return promise;
  }

  private async _doCreateSpace(workspace: FilesystemWorkspace): Promise<Space> {
    const config = await runAndForwardErrors(readComposerConfig(workspace.path));
    if (config.spaceId) {
      const existing = this._client.spaces.get().find((space) => space.id === config.spaceId);
      if (existing && existing.tags.includes(FILESYSTEM_MIRROR_TAG)) {
        this._spaceByWorkspaceId.set(workspace.id, existing);
        return existing;
      }

      log.warn('Mirror space not found, creating new one', {
        workspaceId: workspace.id,
        staleSpaceId: config.spaceId,
      });
      await runAndForwardErrors(writeComposerConfig(workspace.path, { ...config, spaceId: undefined }));
    }

    const space = await this._client.spaces.create(
      {},
      { tags: [FILESYSTEM_MIRROR_TAG], membershipPolicy: MembershipPolicy.LOCKED },
    );
    await space.waitUntilReady();

    const currentConfig = await runAndForwardErrors(readComposerConfig(workspace.path));
    await runAndForwardErrors(writeComposerConfig(workspace.path, { ...currentConfig, spaceId: space.id }));

    this._spaceByWorkspaceId.set(workspace.id, space);
    return space;
  }

  /** Lookup the mirror space for a workspace, returning None if not yet created. */
  getSpaceForWorkspace(workspaceId: string): Option.Option<Space> {
    const space = this._spaceByWorkspaceId.get(workspaceId);
    return space ? Option.some(space) : Option.none();
  }
}
