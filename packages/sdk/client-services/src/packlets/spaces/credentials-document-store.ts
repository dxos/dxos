//
// Copyright 2026 DXOS.org
//

import { type AutomergeUrl, type DocHandle } from '@automerge/automerge-repo';

import { scheduleMicroTask } from '@dxos/async';
import { type Context } from '@dxos/context';
import {
  CREDENTIALS_DOCUMENT_TYPE,
  type CredentialsDocument,
  type OrderedCredential,
  orderCredentials,
} from '@dxos/credentials';
import { AddOnlySet } from '@dxos/echo-doc';
import { type EchoHost } from '@dxos/echo-host';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { schema } from '@dxos/protocols/proto';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

const credentialCodec = schema.getCodecForType('dxos.halo.credentials.Credential');

const CREDENTIALS_PATH = ['credentials'];

/**
 * Read/write access to a space's credentials document, the successor to its control feed.
 */
export class CredentialsDocumentStore {
  constructor(private readonly _handle: DocHandle<CredentialsDocument>) {}

  get url(): AutomergeUrl {
    return this._handle.url;
  }

  /**
   * Credentials in the order the state machine must process them.
   *
   * Read from the change history rather than the current state: a member who can write to the
   * document must not be able to revoke another by deleting their credential.
   */
  read(): OrderedCredential[] {
    const doc = this._handle.doc();
    return doc ? orderCredentials(AddOnlySet.read(doc, CREDENTIALS_PATH)) : [];
  }

  /**
   * Replays the document into `process` and keeps doing so as it changes. Ordering is recomputed on
   * every change because a late-arriving parent can reorder credentials that already arrived.
   */
  subscribe(ctx: Context, process: (credential: Credential) => Promise<boolean>): void {
    const replay = () => {
      scheduleMicroTask(ctx, async () => {
        for (const { credential } of this.read()) {
          await process(credential);
        }
      });
    };

    this._handle.addListener('change', replay);
    ctx.onDispose(() => this._handle.removeListener('change', replay));
    replay();
  }

  /**
   * Appends a credential, keyed by its id so that re-appending one — which the migration backfill and
   * a second device both do — converges instead of duplicating it.
   */
  append(credential: Credential): void {
    const id = credential.id?.toHex();
    invariant(id, 'Credential has no id.');
    if (this._handle.doc()?.credentials?.[id]) {
      return;
    }

    this._handle.change((doc: CredentialsDocument) => {
      doc.credentials ??= {};
      AddOnlySet.add(doc.credentials, id, credentialCodec.encode(credential));
    });
  }
}

/**
 * Opens the space's credentials document, creating and linking it from the space root on first use.
 */
export const openCredentialsDocument = async (
  ctx: Context,
  echoHost: EchoHost,
  spaceId: SpaceId,
): Promise<CredentialsDocumentStore> => {
  const existing = echoHost.getSpaceRootRefs(spaceId)?.credentialsDocUrl;
  const url =
    existing ??
    (await echoHost.setCredentialsDocument(
      ctx,
      spaceId,
      (
        await echoHost.createDoc<CredentialsDocument>({
          type: CREDENTIALS_DOCUMENT_TYPE,
          spaceId,
          credentials: {},
        })
      ).url,
    ));

  const handle = await echoHost.loadDoc<CredentialsDocument>(ctx, url);
  invariant(handle, 'Credentials document must load.');
  return new CredentialsDocumentStore(handle);
};
