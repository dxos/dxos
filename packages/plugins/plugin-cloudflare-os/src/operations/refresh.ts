//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, Obj } from '@dxos/echo';

import { Client, type CloudflareOsError } from '#api';
import { type CloudflareOs } from '#types';

import * as Account from '../Account.ts';

/** Reads the workspace's title and gadgets from the deployment and writes them to the object. */
export const refreshWorkspace: (
  workspace: CloudflareOs.Workspace,
) => Effect.Effect<CloudflareOs.Gadget[], CloudflareOsError, Database.Service> = Effect.fnUntraced(function* (
  workspace,
) {
  const overseer = yield* Account.openWorkspace(workspace);
  const metadata = yield* Client.call('Could not read the workspace.', () => overseer.getMetadata());
  const gadgets = yield* Account.listGadgets(overseer);
  Obj.update(workspace, (workspace) => {
    workspace.name = metadata.title;
    workspace.gadgets = gadgets;
  });
  return gadgets;
}, Effect.scoped);
