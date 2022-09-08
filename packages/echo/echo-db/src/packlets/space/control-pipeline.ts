import { FeedDescriptor } from "@dxos/feed-store";
import { AdmittedFeed, FeedInfo, PartyStateMachine } from "@dxos/halo-protocol";
import { PublicKey, Timeframe } from "@dxos/protocols";
import { Pipeline } from "../pipeline";
import { log } from '@dxos/log'
import { Callback, SubscriptionGroup } from "@dxos/util";

export type ControlPipelineParams = {
  spaceKey: PublicKey;
  genesisFeed: FeedDescriptor;
  initialTimeframe: Timeframe;
  openFeed: (feedKey: PublicKey) => Promise<FeedDescriptor>;
}

export class ControlPipeline {
  private readonly _pipeline: Pipeline;
  private readonly _partyStateMachine: PartyStateMachine;
  private readonly _subscriptions = new SubscriptionGroup();

  public readonly onFeedAdmitted = new Callback<(info: FeedInfo) => void>()

  constructor(params: ControlPipelineParams) {
    this._pipeline = new Pipeline(params.initialTimeframe);
    this._pipeline.addFeed(params.genesisFeed);

    this._partyStateMachine = new PartyStateMachine(params.spaceKey);
    this._subscriptions.push(this._partyStateMachine.feedAdmitted.on(async info => {
      log('Feed admitted', { info })
      if (info.assertion.designation === AdmittedFeed.Designation.CONTROL && !info.key.equals(params.genesisFeed.key)) {
        try {
          this._pipeline.addFeed(await params.openFeed(info.key));
        } catch (err: any) {
          log.catch(err);
        }
      }

      this.onFeedAdmitted.callIfSet(info);
    }))
  }

  start() {
    log('Starting control pipeline')
    setImmediate(async () => {
      for await (const msg of this._pipeline.consume()) {
        try {
          log('Processing message', { msg })
          if (msg.data.halo) {
            const result = await this._partyStateMachine.process(msg.data.halo.credential, PublicKey.from(msg.key));
            if(!result) {
              log.warn('Credential processing failed', { msg })
            }
          }
        } catch (err: any) {
          log.catch(err);
        }
      }
    });

    return this;
  }

  async stop() {
    await this._pipeline.stop();
    this._subscriptions.unsubscribe();
  }

  get writer() {
    return this._pipeline.writer;
  }

  setWriteFeed(feed: FeedDescriptor) {
    this._pipeline.setWriteFeed(feed);
  }
}
