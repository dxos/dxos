//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { PublicKey } from '@dxos/client';
import { checkCredentialType, SpecificCredential } from '@dxos/credentials';
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
export class EpochMonitor extends AbstractPlugin {
  private _subscriptions: ZenObservable.Subscription[] = [];
  private _spaceStates = new ComplexMap<PublicKey, SpaceState>(PublicKey.hash);

  constructor(private readonly _options: EpochMonitorOptions = {}) {
    super();
  }

  /**
   * Monitor all epochs for which the agent is the leader.
   */
  async open() {
    assert(this._client);
    this._subscriptions.push(
      this._client.spaces.subscribe((spaces) => {
        spaces.forEach(async (space) => {
          if (!this._spaceStates.has(space.key)) {
            const state: SpaceState = {
              spaceKey: space.key,
              subscriptions: [],
            };
            this._spaceStates.set(space.key, state);

            setTimeout(async () => {
              await space.waitUntilReady();

              // TODO(burdon): Subscribe to space members to update address book.
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
                    assert(checkCredentialType(pipeline.currentEpoch!, 'dxos.halo.credentials.Epoch'));
                    const timeframe = pipeline.currentEpoch?.subject.assertion.timeframe;
                    const currentEpoch = timeframe.totalMessages();
                    const totalMessages = pipeline.currentDataTimeframe?.totalMessages() ?? 0;
                    log('updated', {
                      space: space.key,
                      totalMessages,
                      currentEpoch,
                      epochTriggered: state.epochTriggered,
                    });

                    // Guard race condition (epoch triggered while processing pipeline update).
                    if (state.epochTriggered) {
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
            });
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
}
