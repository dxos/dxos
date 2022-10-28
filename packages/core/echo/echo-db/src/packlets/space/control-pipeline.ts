//
// Copyright 2022 DXOS.org
//

import { PartyStateMachine, PartyState, MemberInfo, FeedInfo } from '@dxos/credentials';
import { FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { AdmittedFeed, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';
import { AsyncCallback, Callback } from '@dxos/util';

import { Pipeline, PipelineAccessor } from '../pipeline';

export type ControlPipelineParams = {
  spaceKey: PublicKey;
  genesisFeed: FeedWrapper<FeedMessage>;
  feedProvider: (feedKey: PublicKey) => Promise<FeedWrapper<FeedMessage>>;
  initialTimeframe?: Timeframe;
};

/**
 * Processes HALO credentials, which include genesis and invitations.
 */
export class ControlPipeline {
  private readonly _pipeline: Pipeline;
  private readonly _partyStateMachine: PartyStateMachine;

  public readonly onFeedAdmitted = new Callback<AsyncCallback<FeedInfo>>();
  public readonly onMemberAdmitted: Callback<AsyncCallback<MemberInfo>>;
  public readonly onCredentialProcessed: Callback<AsyncCallback<Credential>>;

  constructor({ spaceKey, genesisFeed, feedProvider, initialTimeframe }: ControlPipelineParams) {
    this._pipeline = new Pipeline(initialTimeframe);
    void this._pipeline.addFeed(genesisFeed); // TODO(burdon): Require async open/close?

    this._partyStateMachine = new PartyStateMachine(spaceKey);
    this._partyStateMachine.onFeedAdmitted.set(async (info) => {
      log('feed admitted', { info });

      // TODO(burdon): Check not stopping.
      if (info.assertion.designation === AdmittedFeed.Designation.CONTROL && !info.key.equals(genesisFeed.key)) {
        try {
          const feed = await feedProvider(info.key);
          await this._pipeline.addFeed(feed);
        } catch (err: any) {
          log.catch(err);
        }
      }

      await this.onFeedAdmitted.callIfSet(info);
    });

    this.onMemberAdmitted = this._partyStateMachine.onMemberAdmitted;
    this.onCredentialProcessed = this._partyStateMachine.onCredentialProcessed;
  }

  get partyState(): PartyState {
    return this._partyStateMachine;
  }

  get pipeline(): PipelineAccessor {
    return this._pipeline;
  }

  setWriteFeed(feed: FeedWrapper<FeedMessage>) {
    this._pipeline.setWriteFeed(feed);
  }

  async start() {
    log('starting...');
    setTimeout(async () => {
      for await (const msg of this._pipeline.consume()) {
        try {
          log('processing', { msg });
          if (msg.data.payload['@type'] === 'dxos.echo.feed.CredentialsMessage') {
            const result = await this._partyStateMachine.process(
              msg.data.payload.credential,
              PublicKey.from(msg.feedKey)
            );
            if (!result) {
              log.warn('processing failed', { msg });
            }
          }
        } catch (err: any) {
          log.catch(err);
        }
      }
    });

    await this._pipeline.start();
    log('started');
  }

  async stop() {
    log('stopping...');
    await this._pipeline.stop();
    log('stopped');
  }
}
