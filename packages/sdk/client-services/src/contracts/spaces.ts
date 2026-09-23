//
// Copyright 2026 DXOS.org
//

import { type AutomergeUrl, type DocumentId } from '@automerge/automerge-repo';
import * as EffectContext from 'effect/Context';

import { type Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { type CredentialSigner } from '@dxos/credentials';
import { type SpaceRootRefs } from '@dxos/echo-host';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { type EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import {
  type Credential,
  type MembershipPolicy,
  type ProfileDocument,
  type SpaceMember_Role,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type Timeframe } from '@dxos/timeframe';
import { type ComplexMap } from '@dxos/util';

// The manager is a service, so it gets an interface; `DataSpace` is an aggregate its consumers use
// as a rich object, so an interface over it would duplicate the class rather than abstract it.
// `DataSpace` is an aggregate its consumers use as a rich object, so an interface over it would
// duplicate the class rather than abstract it; it is the one implementation type the contract names.
import { type DataSpace } from '../internal/spaces/data-space.ts';

//
// The data-space subsystem's contract. See `contracts/identity.ts` for why the tags live with the
// interfaces rather than with the implementations.
//

/** What a space needs from the identity to sign and record credentials on its behalf. */
export interface SigningContext {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  credentialSigner: CredentialSigner;
  recordCredential: (credential: Credential) => Promise<void>;
  getProfile: () => ProfileDocument | undefined;
}

export type SigningContextProvider = () => SigningContext;

export type AcceptSpaceOptions = {
  spaceKey: PublicKey;
  genesisFeedKey: PublicKey;

  /** From the admitting `SpaceMember` credential; absent for a space still on its control feed. */
  spaceRootUrl?: string;

  /**
   * Latest known timeframe for the control pipeline.
   * We will try to catch up to this timeframe before starting the data pipeline.
   */
  controlTimeframe?: Timeframe;

  /**
   * Latest known timeframe for the data pipeline.
   * We will try to catch up to this timeframe before initializing the database.
   */
  dataTimeframe?: Timeframe;

  /** Tags assigned to the space member. */
  tags?: string[];
};

export type AdmitMemberOptions = {
  spaceKey: PublicKey;
  identityKey: PublicKey;
  role: SpaceMember_Role;
  profile?: ProfileDocument;
  delegationCredentialId?: PublicKey;
  tags?: string[];

  /** Successor to `genesisFeedKey`: what lets the admitted member replicate from this credential alone. */
  spaceRootUrl?: string;
};

export type CreateSpaceOptions = {
  /**
   * Anchor the space on a space root document, taking its id from that document instead of from the
   * space key. Defaults to the `automergeCredentials` runtime flag, which is off — so a space is
   * key-derived unless the flag opts in. Ignored for an imported space, which brings its own root.
   */
  useSpaceRootDocument?: boolean;

  rootUrl?: AutomergeUrl;
  documents?: Record<DocumentId, Uint8Array>;
  tags?: string[];
  membershipPolicy?: MembershipPolicy;
};

/**
 * The open data spaces, as its consumers use it.
 */
export interface Manager {
  readonly updated: Event;
  open(ctx?: Context): Promise<unknown>;
  close(ctx?: Context): Promise<unknown>;
  waitUntilSpaceReady(spaceKey: PublicKey): Promise<void>;
  readonly spaces: ComplexMap<PublicKey, DataSpace>;
  getSpaceById(spaceId: SpaceId): DataSpace | undefined;
  isSpaceDeleted(spaceKey: PublicKey): boolean;
  createSpace(ctx: Context, options?: CreateSpaceOptions): Promise<DataSpace>;
  acceptSpace(ctx: Context, options: AcceptSpaceOptions): Promise<DataSpace>;
  migrateSpaceToRootDocument(ctx: Context, spaceKey: PublicKey): Promise<SpaceRootRefs>;
  markSpaceDeleted(ctx: Context, spaceKey: PublicKey): Promise<void>;
  deleteAllSpaces(ctx: Context): Promise<void>;
  handleRemoteSpaceDeleted(ctx: Context, spaceKey: PublicKey): Promise<void>;
  admitMember(options: AdmitMemberOptions): Promise<Credential>;
  requestSpaceAdmissionCredential(ctx: Context, spaceKey: PublicKey): Promise<Credential>;
  setSpaceEdgeReplicationSetting(ctx: Context, spaceKey: PublicKey, setting: EdgeReplicationSetting): Promise<void>;
}

/** Effect service tag for {@link Manager}. */
export class ManagerService extends EffectContext.Service<ManagerService, Manager>()(
  '@dxos/client-services/DataSpaceManager',
) {}

/** Effect service tag for {@link SigningContextProvider}. */
export class SigningContextProviderService extends EffectContext.Service<
  SigningContextProviderService,
  SigningContextProvider
>()('@dxos/client-services/SigningContextProvider') {}
