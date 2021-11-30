//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { ECHO } from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ComplexMap } from '@dxos/util';

import { ClientServiceProvider } from '../interfaces';
import { ClientServiceHost } from '../service-host';
import { PartyProxy } from './PartyProxy';

export class EchoProxy {
  private readonly _modelFactory: ModelFactory;
  private _parties = new ComplexMap<PublicKey, PartyProxy>(key => key.toHex());
  private readonly _partiesChanged = new Event();

  constructor (
    private readonly _serviceProvider: ClientServiceProvider
  ) {
    this._modelFactory = _serviceProvider instanceof ClientServiceHost ? _serviceProvider.echo.modelFactory : new ModelFactory();
  }

  get modelFactory (): ModelFactory {
    return this._modelFactory;
  }

  get networkManager () {
    return this._serviceProvider.echo.networkManager;
  }

  toString () {
    return 'EchoProxy';
  }

  info () {
    return this.toString();
  }

  open () {
    const partiesStream = this._serviceProvider.services.PartyService.SubscribeParties();
    partiesStream.subscribe(async data => {
      for (const party of data.parties ?? []) {
        if (!this._parties.has(party.publicKey)) {
          const partyProxy = this.createPartyProxy(party.publicKey);
          await partyProxy.open();
          this._parties.set(party.publicKey, partyProxy);
        }
      }
      this._partiesChanged.emit();
    }, () => {});
  }

  //
  // Parties.
  //

  /**
   * Creates a new party.
   */
  async createParty (): Promise<PartyProxy> {
    const party = await this._serviceProvider.services.PartyService.CreateParty();
    const partyProxy = this.createPartyProxy(party.publicKey);
    await partyProxy.open();
    return partyProxy;
  }

  /**
   * Returns an individual party by its key.
   */
  getParty (partyKey: PartyKey): PartyProxy | undefined {
    return this._parties.get(partyKey);
  }

  private createPartyProxy (partyKey: PartyKey): PartyProxy {
    return new PartyProxy(this._serviceProvider, this._modelFactory, partyKey);
  }

  queryParties (...args: Parameters<ECHO['queryParties']>) {
    return this._serviceProvider.echo.queryParties(...args);
  }

  async joinParty (...args: Parameters<ECHO['joinParty']>) {
    return this._serviceProvider.echo.joinParty(...args);
  }
}
