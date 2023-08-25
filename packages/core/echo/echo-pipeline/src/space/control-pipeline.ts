//
// Copyright 2022 DXOS.org
//

import { SpaceStateMachine, SpaceState, MemberInfo, FeedInfo } from '@dxos/credentials';
import { FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { AdmittedFeed, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';
import { AsyncCallback, Callback, tracer } from '@dxos/util';

import { MetadataStore } from '../metadata';
import { Pipeline, PipelineAccessor } from '../pipeline';
import { TRACE_PROCESSOR, TimeSeriesCounter, TimeUsageCounter, trace } from '@dxos/tracing';
import { Context } from '@dxos/context';
import { FeedMessageBlock } from '@dxos/protocols';

export type ControlPipelineParams = {
  spaceKey: PublicKey;
  genesisFeed: FeedWrapper<FeedMessage>;
  feedProvider: (feedKey: PublicKey) => Promise<FeedWrapper<FeedMessage>>;
  metadataStore: MetadataStore;
};

const TIMEFRAME_SAVE_DEBOUNCE_INTERVAL = 500;

/**
 * Processes HALO credentials, which include genesis and invitations.
 */
@trace.resource()
export class ControlPipeline {
  private readonly _pipeline: Pipeline;
  private readonly _spaceStateMachine: SpaceStateMachine;

  private readonly _spaceKey: PublicKey;
  private readonly _metadata: MetadataStore;
  private _targetTimeframe?: Timeframe;
  private _lastTimeframeSaveTime: number = Date.now();

  public readonly onFeedAdmitted = new Callback<AsyncCallback<FeedInfo>>();
  public readonly onMemberAdmitted: Callback<AsyncCallback<MemberInfo>>;
  public readonly onCredentialProcessed: Callback<AsyncCallback<Credential>>;

  @trace.metricsCounter()
  private _usage = new TimeUsageCounter();

  @trace.metricsCounter()
  private _mutations = new TimeSeriesCounter();

  constructor({ spaceKey, genesisFeed, feedProvider, metadataStore }: ControlPipelineParams) {
    this._spaceKey = spaceKey;
    this._metadata = metadataStore;
    this._pipeline = new Pipeline();
    void this._pipeline.addFeed(genesisFeed); // TODO(burdon): Require async open/close?

    this._spaceStateMachine = new SpaceStateMachine(spaceKey);
    this._spaceStateMachine.onFeedAdmitted.set(async (info) => {
      // log('feed admitted', { info });
      log('feed admitted', { key: info.key });

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

    this.onMemberAdmitted = this._spaceStateMachine.onMemberAdmitted;
    this.onCredentialProcessed = this._spaceStateMachine.onCredentialProcessed;
  }

  get spaceState(): SpaceState {
    return this._spaceStateMachine;
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
      void this._consumePipeline(new Context())
    });

    await this._pipeline.start();
    log('started');
  }

  @trace.span()
  private async _consumePipeline(ctx: Context) {
    for await (const msg of this._pipeline.consume()) {
      const span = this._usage.beginRecording();
      this._mutations.inc();

      try {
        await this._processMessage(ctx, msg)
      } catch (err: any) {
        log.catch(err);
      }
      
      span.end();
    }
  }

  @trace.span()
  private async _processMessage(ctx: Context, msg: FeedMessageBlock) {
    // log('processing', { msg });
    log('processing', { key: msg.feedKey, seq: msg.seq });
    if (msg.data.payload.credential) {
      const timer = tracer.mark('dxos.echo.pipeline.control');
      const result = await this._spaceStateMachine.process(
        msg.data.payload.credential.credential,
        PublicKey.from(msg.feedKey),
      );

      timer.end();
      if (!result) {
        log.warn('processing failed', { msg });
      } else {
        await this._noteTargetStateIfNeeded(this._pipeline.state.pendingTimeframe);
      }
    }
  }

  private async _noteTargetStateIfNeeded(timeframe: Timeframe) {
    // TODO(dmaretskyi): Replace this with a proper debounce/throttle.

    if (Date.now() - this._lastTimeframeSaveTime > TIMEFRAME_SAVE_DEBOUNCE_INTERVAL) {
      this._lastTimeframeSaveTime = Date.now();

      await this._saveTargetTimeframe(timeframe);
    }
  }

  async stop() {
    log('stopping...');
    await this._pipeline.stop();
    await this._saveTargetTimeframe(this._pipeline.state.timeframe);
    log('stopped');
  }

  private async _saveTargetTimeframe(timeframe: Timeframe) {
    try {
      const newTimeframe = Timeframe.merge(this._targetTimeframe ?? new Timeframe(), timeframe);
      await this._metadata.setSpaceControlLatestTimeframe(this._spaceKey, newTimeframe);
      this._targetTimeframe = newTimeframe;
    } catch (err: any) {
      log(err);
    }
  }
}
