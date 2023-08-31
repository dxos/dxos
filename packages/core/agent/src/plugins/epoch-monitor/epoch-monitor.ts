//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/client';
import { Space } from '@dxos/client-protocol';
import { checkCredentialType, SpecificCredential } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexMap } from '@dxos/util';

import { AbstractPlugin } from '../plugin';

type SpaceState = {
  spaceKey: PublicKey;
  currentEpoch?: SpecificCredential<Epoch>;
  epochTriggered?: number;
  subscriptions: ZenObservable.Subscription[];
};

const DEFAULT_EPOCH_LIMIT = 10_000;

export type EpochMonitorOptions = {
  limit?: number;
};

/**
 * Pipeline monitor:
 * - Triggers new epochs.
 * - Updates address book.
 */
// TODO(burdon): Create test.
export class EpochMonitor extends AbstractPlugin {
  private _subscriptions: ZenObservable.Subscription[] = [];
  private _spaceStates = new ComplexMap<PublicKey, SpaceState>(PublicKey.hash);

  constructor(private readonly _options: EpochMonitorOptions = {}) {
    super();
  }

  /**
   * Monitor spaces for which the agent is the leader.
   */
  async open() {
    invariant(this._client);
    this._subscriptions.push(
      this._client.spaces.subscribe((spaces) => {
        spaces.forEach(async (space) => {
          if (!this._spaceStates.has(space.key)) {
            const state: SpaceState = {
              spaceKey: space.key,
              subscriptions: [],
            };

            this._spaceStates.set(space.key, state);

            // Process asynchronously.
            if (space.isOpen) {
              setTimeout(async () => {
                await space.waitUntilReady();
                await this._monitorSpace(space, state);
              });
            }
          }
        });
      }),
    );
  }

  async close() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
    this._spaceStates.forEach((state) => state.subscriptions.forEach((subscription) => subscription.unsubscribe()));
    this._spaceStates.clear();
  }

  // TODO(burdon): Subscribe to space members to update address book.
  private async _monitorSpace(space: Space, state: SpaceState) {
    state.subscriptions.push(
      space.members.subscribe((members) =>
        log('updated', { members: members.map((member) => member.identity.identityKey) }),
      ),
    );

    // Monitor spaces owned by this agent.
    if (this._client!.halo.identity.get()!.identityKey.equals(space.internal.data.creator!)) {
      log('monitoring', { space: state.spaceKey });

      // Listen for epochs.
      const limit = this._options.limit ?? DEFAULT_EPOCH_LIMIT;
      state.subscriptions.push(
        space.pipeline.subscribe(async (pipeline) => {
          // TODO(burdon): Rather than total messages, implement inequality in timeframe?
          invariant(checkCredentialType(pipeline.currentEpoch!, 'dxos.halo.credentials.Epoch'));
          const timeframe = pipeline.currentEpoch?.subject.assertion.timeframe;
          // TODO(burdon): timeframe.newMessages().
          const currentEpoch = timeframe.totalMessages();
          const totalMessages = pipeline.currentDataTimeframe?.totalMessages() ?? 0;
          log('updated', {
            space: space.key,
            totalMessages,
            currentEpoch,
            epochTriggered: state.epochTriggered,
          });

          // Prevent epoch creation while one is already being created.
          if (state.epochTriggered !== undefined) {
            state.epochTriggered = undefined;
          } else {
            // TODO(burdon): New epoch message # is off by one.
            const triggerEpoch = totalMessages > currentEpoch && totalMessages % limit === 0;
            if (triggerEpoch) {
              log('trigger epoch', { space: space.key });
              state.epochTriggered = totalMessages;
              await this._clientServices!.services.SpacesService!.createEpoch({ spaceKey: space.key });
            }
          }
        }),
      );
    }
  }
}
