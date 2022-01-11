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
import { failUndefined, raise } from '@dxos/debug';
import { ECHO, InvitationDescriptor, OpenProgress, Party, PartyNotFoundError } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';

import { createDevtoolsHost, DevtoolsHostEvents, DevtoolsServiceDependencies } from './devtools';
import { ClientServiceProvider, ClientServices } from './interfaces';
import { Contacts, SubscribeMembersResponse, SubscribePartiesResponse, SubscribePartyResponse } from './proto/gen/dxos/client';
import { DevtoolsHost } from './proto/gen/dxos/devtools';
import { createStorageObjects } from './storage';
import { decodeInvitation, resultSetToStream, encodeInvitation } from './util';

interface InviterInvitation {
  invitationCode: string
  secret: string | undefined
}

interface InviteeInvitation {
  secret?: string | undefined // Can be undefined initially, then set after receiving secret from the inviter.
  secretTrigger?: () => void // Is triggered after supplying the secret.
  joinPromise?: () => Promise<Party> // Resolves when the joining process finishes.
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
            const secret = generatePasscode();
            let invitation: InvitationDescriptor; // eslint-disable-line prefer-const
            const secretProvider = async () => {
              next({ invitationCode: encodeInvitation(invitation), secret });
              return Buffer.from(secret);
            };
            invitation = await this._echo.halo.createInvitation({
              secretProvider,
              secretValidator: defaultSecretValidator
            }, {
              onFinish: () => {
                next({ finished: true });
                close();
              }
            });
            const invitationCode = encodeInvitation(invitation);
            this._inviterInvitations.push({ invitationCode, secret });
            next({ invitationCode });
          });
        }),
        AcceptInvitation: async (request) => {
          const id = v4();
          assert(request.invitationCode, 'InvitationCode not provided.');
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
          const haloPartyPromise = this._echo.halo.join(decodeInvitation(request.invitationCode), secretProvider);
          inviteeInvitation.joinPromise = () => haloPartyPromise; // After awaiting this we have a finished joining flow.
          this._inviteeInvitations.set(id, inviteeInvitation);
          return { id };
        },
        AuthenticateInvitation: (request) => new Stream(({ next, close }) => {
          assert(request.process?.id, 'Process ID is missing.');
          const invitation = this._inviteeInvitations.get(request.process?.id);
          assert(invitation, 'Invitation not found.');
          assert(request.secret, 'Secret not provided.');

          // Supply the secret, and move the internal invitation process by triggering the secretTrigger.
          invitation.secret = request.secret;
          invitation.secretTrigger?.();

          next({});
          void invitation.joinPromise?.().then(() => {
            const profile = this._echo.halo.getProfile();
            assert(profile, 'Profile not created.');
            next({ profile });
            close();
          });
        }),
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
            if (this._echo.isOpen) {
              const party = this._echo.getParty(request.partyKey);
              next({
                party: party && {
                  publicKey: party.key,
                  isOpen: party.isOpen,
                  isActive: party.isActive
                }
              });
            }
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
        OpenParty: async (request) => {
          const party = this._echo.getParty(request.partyKey);
          if (!party) {
            throw new Error('Party not found');
          }

          await party.open();
        },
        CloseParty: async (request) => {
          const party = this._echo.getParty(request.partyKey);
          if (!party) {
            throw new Error('Party not found');
          }

          await party.close();
        },
        ActivateParty: async (request) => {
          const party = this._echo.getParty(request.partyKey);
          if (!party) {
            throw new Error('Party not found');
          }

          await party.activate(request.options);
        },
        DeactivateParty: async (request) => {
          const party = this._echo.getParty(request.partyKey);
          if (!party) {
            throw new Error('Party not found');
          }

          await party.deactivate(request.options);
        },
        CreateInvitation: (request) => new Stream(({ next, close }) => {
          const party = this.echo.getParty(request.publicKey) ?? raise(new PartyNotFoundError(request.publicKey));
          setImmediate(async () => {
            try {
              const secret = generatePasscode();
              const secretProvider = async () => {
                next({ connected: true });
                return Buffer.from(secret);
              };
              const invitation = await party.createInvitation({
                secretProvider,
                secretValidator: defaultSecretValidator
              }, {
                onFinish: () => {
                  next({ finished: true });
                  close();
                }
              });
              const invitationCode = encodeInvitation(invitation);
              this._inviterInvitations.push({ invitationCode, secret });
              next({ invitationCode, secret });
            } catch (error: any) {
              next({ error: error.message });
              close();
            }
          });
        }),
        AcceptInvitation: async (request) => {
          const id = v4();
          assert(request.invitationCode, 'InvitationCode not provided.');
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
          const partyPromise = this.echo.joinParty(decodeInvitation(request.invitationCode), secretProvider);
          inviteeInvitation.joinPromise = () => partyPromise; // After awaiting this we have a finished joining flow.
          this._inviteeInvitations.set(id, inviteeInvitation);
          return { id };
        },
        AuthenticateInvitation: async (request) => {
          assert(request.process?.id, 'Process ID is missing.');
          const invitation = this._inviteeInvitations.get(request.process?.id);
          assert(invitation, 'Invitation not found.');
          assert(request.secret, 'Secret not provided.');

          // Supply the secret, and move the internal invitation process by triggering the secretTrigger.
          invitation.secret = request.secret;
          invitation.secretTrigger?.();

          const party = await invitation.joinPromise?.() ?? failUndefined();

          return {
            partyKey: party.key
          };
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
