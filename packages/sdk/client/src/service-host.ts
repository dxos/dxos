//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { v4 } from 'uuid';

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { defaultSecretValidator, generatePasscode, SecretProvider } from '@dxos/credentials';
import * as debug from '@dxos/debug'; // TODO(burdon): ???
import { raise } from '@dxos/debug';
import { ECHO, InvitationDescriptor, OpenProgress, PartyNotFoundError } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';

import { createDevtoolsHost, DevtoolsHostEvents, DevtoolsServiceDependencies } from './devtools';
import { ClientServiceProvider, ClientServices } from './interfaces';
import { Contacts, InvitationState, SubscribeMembersResponse, SubscribePartiesResponse, SubscribePartyResponse } from './proto/gen/dxos/client';
import { DevtoolsHost } from './proto/gen/dxos/devtools';
import { createStorageObjects } from './storage';
import { encodeInvitation, resultSetToStream } from './util';

interface InviterInvitation {
  // TODO(rzadp): Change it to use descrptiors with secrets build-in instead.
  invitationCode: string
  secret: string | undefined
}

interface InviteeInvitation {
  secret?: string | undefined // Can be undefined initially, then set after receiving secret from the inviter.
  secretTrigger?: () => void // Is triggered after supplying the secret.
}

export class ClientServiceHost implements ClientServiceProvider {
  private readonly _echo: ECHO;
  private readonly _inviterInvitations: InviterInvitation[] = []; // List of pending invitations from the inviter side.
  private readonly _inviteeInvitations: Map<string, InviteeInvitation> = new Map(); // Map of pending invitations from the invitee side.

  private readonly _devtoolsEvents = new DevtoolsHostEvents();

  constructor (
    private readonly _config: Config
  ) {
    const { feedStorage, keyStorage, snapshotStorage, metadataStorage } = createStorageObjects(
      this._config.get('system.storage', {})!,
      this._config.get('system.enableSnapshots', false)
    );

    this._echo = new ECHO({
      feedStorage,
      keyStorage,
      snapshotStorage,
      metadataStorage,
      networkManagerOptions: {
        signal: this._config.get('services.signal.server') ? [this._config.get('services.signal.server')!] : undefined,
        ice: this._config.get('services.ice'),
        log: true
      },
      snapshots: this._config.get('system.enableSnapshots', false),
      snapshotInterval: this._config.get('system.snapshotInterval')
    });

    // TODO(wittjosiah): Factor out service implementations.
    this.services = {
      SystemService: {
        GetConfig: async () => {
          return {
            ...this._config.values,
            build: {
              ...this._config.values.build,
              timestamp: undefined // TODO(rzadp): Substitution did not kick in here?.
            }
          };
        },
        Reset: async () => {
          await this._echo.reset();
        }
      },
      ProfileService: {
        SubscribeProfile: () => new Stream(({ next }) => {
          const emitNext = () => next({
            profile: this._echo.halo.isInitialized ? this._echo.halo.getProfile() : undefined
          });

          emitNext();
          return this._echo.halo.subscribeToProfile(emitNext);
        }),
        CreateProfile: async (opts) => {
          return this._echo.halo.createProfile(opts);
        },
        RecoverProfile: () => {
          throw new Error('Not implemented');
        },
        CreateInvitation: () => new Stream(({ next, close }) => {
          setImmediate(async () => {
            const secret = Buffer.from(generatePasscode());
            let invitation: InvitationDescriptor; // eslint-disable-line prefer-const
            const secretProvider = async () => {
              next({ descriptor: invitation.toProto(), state: InvitationState.CONNECTED });
              return Buffer.from(secret);
            };
            invitation = await this._echo.halo.createInvitation({
              secretProvider,
              secretValidator: defaultSecretValidator
            }, {
              onFinish: () => {
                next({ state: InvitationState.FINISHED });
                close();
              }
            });
            invitation.secret = secret;
            const invitationCode = encodeInvitation(invitation);
            this._inviterInvitations.push({ invitationCode, secret: invitation.secret.toString() });
            next({ descriptor: invitation.toProto(), state: InvitationState.WAITING_FOR_CONNECTION });
          });
        }),
        AcceptInvitation: (request) => new Stream(({ next, close }) => {
          const id = v4();
          const [secretLatch, secretTrigger] = latch();
          const inviteeInvitation: InviteeInvitation = { secretTrigger };

          // Secret will be provided separately (in AuthenticateInvitation).
          // Process will continue when `secretLatch` resolves, triggered by `secretTrigger`.
          const secretProvider: SecretProvider = async () => {
            await secretLatch;
            const secret = inviteeInvitation.secret;
            if (!secret) {
              throw new Error('Secret not provided.');
            }
            return Buffer.from(secret);
          };

          // Joining process is kicked off, and will await authentication with a secret.
          const haloPartyPromise = this._echo.halo.join(InvitationDescriptor.fromProto(request), secretProvider);
          this._inviteeInvitations.set(id, inviteeInvitation);
          next({ id, state: InvitationState.CONNECTED });

          haloPartyPromise.then(party => {
            next({ id, state: InvitationState.FINISHED, partyKey: party.key });
          }).catch(err => {
            next({ id, state: InvitationState.ERROR, error: String(err) });
          });
        }),
        AuthenticateInvitation: async (request) => {
          assert(request.processId, 'Process ID is missing.');
          const invitation = this._inviteeInvitations.get(request.processId);
          assert(invitation, 'Invitation not found.');
          assert(request.secret, 'Secret not provided.');

          // Supply the secret, and move the internal invitation process by triggering the secretTrigger.
          invitation.secret = request.secret.toString();
          invitation.secretTrigger?.();
        },
        SubscribeContacts: () => {
          if (this._echo.halo.isInitialized) {
            return resultSetToStream(this._echo.halo.queryContacts(), (contacts): Contacts => ({ contacts }));
          } else {
            return new Stream(({ next }) => {
              const subGroup = new SubscriptionGroup();

              setImmediate(async () => {
                await this._echo.halo.identityReady.waitForCondition(() => this._echo.halo.isInitialized);

                const resultSet = this._echo.halo.queryContacts();
                next({ contacts: resultSet.value });
                subGroup.push(resultSet.update.on(() => next({ contacts: resultSet.value })));
              });

              return () => subGroup.unsubscribe();
            });
          }
        }
      },
      PartyService: {
        SubscribeToParty: (request) => {
          const update = (next: (message: SubscribePartyResponse) => void) => {
            const party = this._echo.getParty(request.partyKey);
            next({
              party: party && {
                publicKey: party.key,
                isOpen: party.isOpen,
                isActive: party.isActive
              }
            });
          };

          const party = this._echo.getParty(request.partyKey);
          if (party) {
            return new Stream(({ next }) => {
              return party.update.on(() => update(next));
            });
          } else {
            return new Stream(({ next }) => {
              let unsubscribeParty: () => void;
              const unsubscribeParties = this._echo.queryParties().subscribe((parties) => {
                const party = parties.find((party) => party.key.equals(request.partyKey));
                if (party && !unsubscribeParty) {
                  unsubscribeParty = party.update.on(() => update(next));
                }
              });

              update(next);

              return () => {
                unsubscribeParties();
                unsubscribeParty?.();
              };
            });
          }
        },
        SubscribeParties: () => {
          return resultSetToStream(this._echo.queryParties(), (parties): SubscribePartiesResponse => {
            return ({
              parties: parties.map(party => ({
                publicKey: party.key,
                isOpen: party.isOpen,
                isActive: party.isActive
              }))
            });
          });
        },
        CreateParty: async () => {
          const party = await this._echo.createParty();
          return {
            publicKey: party.key,
            isOpen: party.isOpen,
            isActive: party.isActive
          };
        },
        SetPartyState: async (request) => {
          const party = this._echo.getParty(request.partyKey);
          if (!party) {
            throw new Error('Party not found');
          }

          if (request.open === true) {
            await party.open();
          } else if (request.open === false) {
            await party.close();
          } // Undefined preserves previous state.

          if (request.activeGlobal === true) {
            await party.activate({ global: true });
          } else if (request.activeGlobal === false) {
            await party.deactivate({ global: true });
          } // Undefined preserves previous state.

          if (request.activeDevice === true) {
            await party.activate({ device: true });
          } else if (request.activeDevice === false) {
            await party.deactivate({ device: true });
          } // Undefined preserves previous state.
          return {
            publicKey: party.key,
            isOpen: party.isOpen,
            isActive: party.isActive
          };
        },
        CreateInvitation: (request) => new Stream(({ next, close }) => {
          const party = this.echo.getParty(request.partyKey) ?? raise(new PartyNotFoundError(request.partyKey));
          setImmediate(async () => {
            try {
              const secret = generatePasscode();
              const secretProvider = async () => {
                next({ state: InvitationState.CONNECTED });
                return Buffer.from(secret);
              };
              const invitation = await party.createInvitation({
                secretProvider,
                secretValidator: defaultSecretValidator
              }, {
                onFinish: () => {
                  next({ state: InvitationState.FINISHED });
                  close();
                }
              });
              invitation.secret = Buffer.from(secret);
              const invitationCode = encodeInvitation(invitation);
              this._inviterInvitations.push({ invitationCode, secret });
              next({ state: InvitationState.WAITING_FOR_CONNECTION, descriptor: invitation.toProto() });
            } catch (error: any) {
              next({ state: InvitationState.ERROR, error: error.message });
              close();
            }
          });
        }),
        AcceptInvitation: (request) => new Stream(({ next, close }) => {
          const id = v4();
          const [secretLatch, secretTrigger] = latch();
          const inviteeInvitation: InviteeInvitation = { secretTrigger };

          // Secret will be provided separately (in AuthenticateInvitation).
          // Process will continue when `secretLatch` resolves, triggered by `secretTrigger`.
          const secretProvider: SecretProvider = async () => {
            await secretLatch;
            const secret = inviteeInvitation.secret;
            if (!secret) {
              throw new Error('Secret not provided.');
            }
            return Buffer.from(secret);
          };

          // Joining process is kicked off, and will await authentication with a secret.
          const haloPartyPromise = this.echo.joinParty(InvitationDescriptor.fromProto(request), secretProvider);
          this._inviteeInvitations.set(id, inviteeInvitation);
          next({ id, state: InvitationState.CONNECTED });

          haloPartyPromise.then(party => {
            next({ id, state: InvitationState.FINISHED, partyKey: party.key });
          }).catch(err => {
            next({ id, state: InvitationState.ERROR, error: String(err) });
          });
        }),
        AuthenticateInvitation: async (request) => {
          assert(request.processId, 'Process ID is missing.');
          const invitation = this._inviteeInvitations.get(request.processId);
          assert(invitation, 'Invitation not found.');
          assert(request.secret, 'Secret not provided.');

          // Supply the secret, and move the internal invitation process by triggering the secretTrigger.
          invitation.secret = request.secret.toString();
          invitation.secretTrigger?.();
        },
        SubscribeMembers: (request) => {
          const party = this._echo.getParty(request.partyKey);
          if (party) {
            return resultSetToStream(party.queryMembers(), (members): SubscribeMembersResponse => ({ members }));
          } else {
            return new Stream(({ next }) => {
              let unsubscribeMembers: () => void;
              const unsubscribeParties = this._echo.queryParties().subscribe((parties) => {
                const party = parties.find((party) => party.key.equals(request.partyKey));
                if (!unsubscribeMembers && party) {
                  const resultSet = party.queryMembers();
                  next({ members: resultSet.value });
                  unsubscribeMembers = resultSet.update.on(() => next({ members: resultSet.value }));
                }
              });

              return () => {
                unsubscribeParties();
                unsubscribeMembers();
              };
            });
          }
        }
      },
      DataService: this._echo.dataService,
      DevtoolsHost: this._createDevtoolsService(),
      TracingService: {
        SetTracingOptions: () => {
          throw new Error('Tracing not available');
        },
        SubscribeToRpcTrace: () => {
          throw new Error('Tracing not available');
        }
      }
    };
  }

  readonly services: ClientServices;

  async open (onProgressCallback?: ((progress: OpenProgress) => void) | undefined) {
    await this._echo.open(onProgressCallback);
    this._devtoolsEvents.ready.emit();
  }

  async close () {
    await this._echo.close();
  }

  get echo () {
    return this._echo;
  }

  /**
   * Returns devtools context.
   * Used by the DXOS DevTool Extension.
   */
  private _createDevtoolsService (): DevtoolsHost {
    const dependencies: DevtoolsServiceDependencies = {
      config: this._config,
      echo: this._echo,
      feedStore: this._echo.feedStore,
      networkManager: this._echo.networkManager,
      modelFactory: this._echo.modelFactory,
      keyring: this._echo.halo.keyring,
      debug
    };

    return createDevtoolsHost(dependencies, this._devtoolsEvents);
  }
}
