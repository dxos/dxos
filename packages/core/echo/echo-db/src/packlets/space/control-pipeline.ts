//
// Copyright 2022 DXOS.org
//

import { FeedDescriptor } from '@dxos/feed-store';
import { FeedInfo, MemberInfo, PartyState, PartyStateMachine } from '@dxos/halo-protocol';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Timeframe } from '@dxos/protocols';
import { AdmittedFeed, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AsyncCallback, Callback } from '@dxos/util';

import { Pipeline, PipelineAccessor } from '../pipeline';

export type ControlPipelineParams = {
  spaceKey: PublicKey
  genesisFeed: FeedDescriptor
  feedProvider: (feedKey: PublicKey) => Promise<FeedDescriptor>
  initialTimeframe: Timeframe
}

/**
 * Processes HALO credentials, which include genesis and invitations.
 */
export class ControlPipeline {
  private readonly _pipeline: Pipeline;
  private readonly _partyStateMachine: PartyStateMachine;

  public readonly onCredentialProcessed: Callback<AsyncCallback<Credential>>;
  public readonly onFeedAdmitted = new Callback<AsyncCallback<FeedInfo>>();
  public readonly onMemberAdmitted: Callback<AsyncCallback<MemberInfo>>;

  constructor ({
    spaceKey,
    genesisFeed,
    feedProvider,
    initialTimeframe
  }: ControlPipelineParams) {
    this._pipeline = new Pipeline(initialTimeframe);
    this._pipeline.addFeed(genesisFeed);

    this._partyStateMachine = new PartyStateMachine(spaceKey);
    this._partyStateMachine.onFeedAdmitted.set(async info => {
      log('Feed admitted', { info });
      if (info.assertion.designation === AdmittedFeed.Designation.CONTROL && !info.key.equals(genesisFeed.key)) {
        try {
          const feed = await feedProvider(info.key);
          this._pipeline.addFeed(feed);
        } catch (err: any) {
          log.catch(err);
        }
      }

      await this.onFeedAdmitted.callIfSet(info);
    });

    this.onCredentialProcessed = this._partyStateMachine.onCredentialProcessed;
    this.onMemberAdmitted = this._partyStateMachine.onMemberAdmitted;
  }

  get partyState (): PartyState {
    return this._partyStateMachine;
  }

  get pipeline (): PipelineAccessor {
    return this._pipeline;
  }

  setWriteFeed (feed: FeedDescriptor) {
    this._pipeline.setWriteFeed(feed);
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
    log('Stopping control pipeline');
    await this._pipeline.stop();
  }
}
