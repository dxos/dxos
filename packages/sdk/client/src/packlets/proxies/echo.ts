//
// Copyright 2022 DXOS.org
//

import { CancellableObservable } from '@dxos/async';
import { InvitationEvents } from '@dxos/client-services';
import { Database, ResultSet } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelConstructor } from '@dxos/model-factory';
import { ObjectProperties } from '@dxos/object-model';
import { PartyDetails } from '@dxos/protocols/proto/dxos/client';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { PartySnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

import { ActivationOptions, PartyMember } from '../proxies';

/**
 * Party API.
 */
// TODO(burdon): Separate public API form implementation (move comments here).
export interface Party {
  get key(): PublicKey;
  get isOpen(): boolean;
  get isActive(): boolean;

  // TODO(burdon): Verbs should be on same interface.
  get database(): Database;
  get select(): Database['select'];
  get reduce(): Database['reduce'];

  // TODO(burdon): Rename open/close.
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  open(): Promise<void>;
  close(): Promise<void>;

  /**
   * @deprecated
   */
  setActive(active: boolean, options: ActivationOptions): Promise<void>;

  /**
   * @deprecated
   */
  // TODO(burdon): Change to `space.properties.title`.
  setTitle(title: string): Promise<void>;
  /**
   * @deprecated
   */
  getTitle(): string;
  /**
   * @deprecated
   */
  getDetails(): Promise<PartyDetails>;
  /**
   * @deprecated
   */
  get properties(): ObjectProperties;
  /**
   * @deprecated
   */
  setProperty(key: string, value?: any): Promise<void>;
  /**
   * @deprecated
   */
  getProperty(key: string, defaultValue?: any): any;

  queryMembers(): ResultSet<PartyMember>;
  createInvitation(): CancellableObservable<InvitationEvents>;

  createSnapshot(): Promise<PartySnapshot>;
}

/**
 * ECHO API.
 */
// TODO(burdon): Separate public API form implementation (move comments here).
export interface Echo {
  info: { parties: number };
  registerModel(constructor: ModelConstructor<any>): void;
  createParty(): Promise<Party>;
  cloneParty(snapshot: PartySnapshot): Promise<Party>;
  getParty(partyKey: PublicKey): Party | undefined;
  queryParties(): ResultSet<Party>;
  acceptInvitation(invitation: Invitation): CancellableObservable<InvitationEvents>;
}
