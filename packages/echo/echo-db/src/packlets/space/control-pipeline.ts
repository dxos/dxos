//
// Copyright 2022 DXOS.org
//

import { FeedDescriptor } from '@dxos/feed-store';
import { AdmittedFeed, Credential, FeedInfo, MemberInfo, PartyState, PartyStateMachine } from '@dxos/halo-protocol';
import { log } from '@dxos/log';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { AsyncCallback, Callback, SubscriptionGroup } from '@dxos/util';

import { Pipeline } from '../pipeline';

export type ControlPipelineParams = {
  spaceKey: PublicKey
  genesisFeed: FeedDescriptor
  initialTimeframe: Timeframe
  feedProvider: (feedKey: PublicKey) => Promise<FeedDescriptor>
}

/**
 * The control pipeline processes HALO credentials, which include genesis and invitations.
 */
export class ControlPipeline {
  private readonly _pipeline: Pipeline;
  private readonly _partyStateMachine: PartyStateMachine;
  private readonly _subscriptions = new SubscriptionGroup();

  public readonly onCredentialProcessed: Callback<AsyncCallback<Credential>>;
  public readonly onFeedAdmitted = new Callback<AsyncCallback<FeedInfo>>();
  public readonly onMemberAdmitted: Callback<AsyncCallback<MemberInfo>>;

  constructor ({
    initialTimeframe,
    genesisFeed,
    spaceKey,
    feedProvider
  }: ControlPipelineParams) {
    this._pipeline = new Pipeline(initialTimeframe);
    this._pipeline.addFeed(genesisFeed);

    this._partyStateMachine = new PartyStateMachine(spaceKey);
    this.onCredentialProcessed = this._partyStateMachine.onCredentialProcessed;
    this._partyStateMachine.onFeedAdmitted.set(async info => {
      log('Feed admitted', { info });
      if (info.assertion.designation === AdmittedFeed.Designation.CONTROL && !info.key.equals(genesisFeed.key)) {
        try {
          this._pipeline.addFeed(await feedProvider(info.key));
        } catch (err: any) {
          log.catch(err);
        }
      }

      await this.onFeedAdmitted.callIfSet(info);
    });
    this.onMemberAdmitted = this._partyStateMachine.onMemberAdmitted;
  }

  start () {
    log('Starting control pipeline');
    setImmediate(async () => {
      for await (const msg of this._pipeline.consume()) {
        try {
          log('Processing message', { msg });
          if (msg.data.payload['@type'] === 'dxos.echo.feed.CredentialsMessage') {
            const result = await this._partyStateMachine.process(msg.data.payload.credential, PublicKey.from(msg.key));
            if (!result) {
              log.warn('Credential processing failed', { msg });
            }
          }
        } catch (err: any) {
          log.catch(err);
        }
      }
    });

    return this;
  }

  async stop () {
    await this._pipeline.stop();
    this._subscriptions.unsubscribe();
  }

  get writer () {
    return this._pipeline.writer;
  }

  setWriteFeed (feed: FeedDescriptor) {
    this._pipeline.setWriteFeed(feed);
  }

  get pipelineState () {
    return this._pipeline.state;
  }

  get partyState (): PartyState {
    return this._partyStateMachine;
  }
}
