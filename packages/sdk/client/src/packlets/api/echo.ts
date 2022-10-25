//
// Copyright 2022 DXOS.org
//

import { InvitationDescriptor } from '@dxos/client-services';
import { Database, ResultSet } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelConstructor } from '@dxos/model-factory';
import { ObjectProperties } from '@dxos/object-model';
import { PartyDetails } from '@dxos/protocols/proto/dxos/client';
import { PartySnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

import { ActivationOptions, PartyMember } from '../proxies';
import { Invitation } from './invitation';
import { InvitationRequest } from './invitation-request';

export interface CreationInvitationOptions {
  inviteeKey?: PublicKey;
}

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

  initialize(): Promise<void>;
  destroy(): Promise<void>;

  open(): Promise<void>;
  close(): Promise<void>;
  setActive(active: boolean, options: ActivationOptions): Promise<void>;

  setTitle(title: string): Promise<void>;
  getTitle(): string;

  // TODO(burdon): Rename (info?)
  getDetails(): Promise<PartyDetails>;

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
  createInvitation(options?: CreationInvitationOptions): Promise<InvitationRequest>;

  createSnapshot(): Promise<PartySnapshot>;
}

export class PartyInvitation extends Invitation<Party> {
  /**
   * Wait for the invitation flow to complete and return the target party.
   */
  getParty(): Promise<Party> {
    return this.wait();
  }
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
  acceptInvitation(invitationDescriptor: InvitationDescriptor): PartyInvitation;
}
