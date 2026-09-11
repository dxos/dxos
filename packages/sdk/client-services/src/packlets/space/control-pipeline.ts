//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { DeferredTask, scheduleMicroTask, sleepWithContext, trackLeaks } from '@dxos/async';
import { Context } from '@dxos/context';
import {
  type DelegateInvitationCredential,
  type FeedInfo,
  type MemberInfo,
  type SpaceState,
  SpaceStateMachine,
} from '@dxos/credentials';
import { type FeedWrapper } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type FeedMessageBlock } from '@dxos/protocols';
import { fromPublicKey, fromTimeframe, requirePublicKey, toTimeframe } from '@dxos/protocols/buf';
import type { FeedMessage } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import {
  type ControlPipelineSnapshot,
  ControlPipelineSnapshot_ControlMessageSchema,
  ControlPipelineSnapshotSchema,
} from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { AdmittedFeed_Designation, type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Timeframe } from '@dxos/timeframe';
import { trace } from '@dxos/tracing';
import { type AsyncCallback, Callback, tracer } from '@dxos/util';

import { type IMetadataStore } from '../metadata/index.ts';
import { Pipeline, type PipelineAccessor } from '../pipeline/index.ts';

export type ControlPipelineProps = {
  spaceKey: PublicKey;
  genesisFeed: FeedWrapper<FeedMessage>;
  feedProvider: (feedKey: PublicKey) => Promise<FeedWrapper<FeedMessage>>;
  metadataStore: IMetadataStore;
};

const TIMEFRAME_SAVE_DEBOUNCE_INTERVAL = 500;

const CONTROL_PIPELINE_SNAPSHOT_DELAY = 10_000;

const USE_SNAPSHOTS = true;

/**
 * Processes HALO credentials, which include genesis and invitations.
 */
@trackLeaks('start', 'stop')
export class ControlPipeline {
  private readonly _ctx = new Context();
  private readonly _pipeline: Pipeline;
  private readonly _spaceStateMachine: SpaceStateMachine;

  private readonly _spaceKey: PublicKey;
  private readonly _metadata: IMetadataStore;
  private _targetTimeframe?: Timeframe;
  private _lastTimeframeSaveTime: number = Date.now();

  public readonly onFeedAdmitted = new Callback<AsyncCallback<FeedInfo>>();
  public readonly onMemberRoleChanged: Callback<AsyncCallback<MemberInfo[]>>;
  public readonly onCredentialProcessed: Callback<AsyncCallback<Credential>>;
  public readonly onDelegatedInvitation: Callback<AsyncCallback<DelegateInvitationCredential>>;
  public readonly onDelegatedInvitationRemoved: Callback<AsyncCallback<DelegateInvitationCredential>>;

  private _snapshotTask = new DeferredTask(this._ctx, async () => {
    await sleepWithContext(this._ctx, CONTROL_PIPELINE_SNAPSHOT_DELAY);
    await this._saveSnapshot();
  });

  constructor({ spaceKey, genesisFeed, feedProvider, metadataStore }: ControlPipelineProps) {
    this._spaceKey = spaceKey;
    this._metadata = metadataStore;
    this._pipeline = new Pipeline();
    void this._pipeline.addFeed(genesisFeed); // TODO(burdon): Require async open/close?

    this._spaceStateMachine = new SpaceStateMachine(spaceKey);
    this._spaceStateMachine.onFeedAdmitted.set(async (info) => {
      // log('feed admitted', { info });
      log('feed admitted', { key: info.key });

      // TODO(burdon): Check not stopping.
      if (info.assertion.designation === AdmittedFeed_Designation.CONTROL && !info.key.equals(genesisFeed.key)) {
        scheduleMicroTask(this._ctx, async () => {
          try {
            const feed = await feedProvider(info.key);
            if (this._ctx.disposed) {
              return;
            }
            if (!this._pipeline.hasFeed(feed.key)) {
              await this._pipeline.addFeed(feed);
            }
          } catch (err: any) {
            log.catch(err);
          }
        });
      }

      await this.onFeedAdmitted.callIfSet(info);
    });

    this.onMemberRoleChanged = this._spaceStateMachine.onMemberRoleChanged;
    this.onCredentialProcessed = this._spaceStateMachine.onCredentialProcessed;
    this.onDelegatedInvitation = this._spaceStateMachine.onDelegatedInvitation;
    this.onDelegatedInvitationRemoved = this._spaceStateMachine.onDelegatedInvitationRemoved;
  }

  get spaceState(): SpaceState {
    return this._spaceStateMachine;
  }

  /**
   * Feeds a credential that came from the space's credentials document rather than a feed. Processing
   * is idempotent by credential id, so a credential the feed already delivered is a no-op — which is
   * what lets both sources run during the migration window.
   */
  async processDocumentCredential(credential: Credential): Promise<boolean> {
    return this._spaceStateMachine.process(credential, {});
  }

  get pipeline(): PipelineAccessor {
    return this._pipeline;
  }

  async setWriteFeed(feed: FeedWrapper<FeedMessage>): Promise<void> {
    await this._pipeline.addFeed(feed);
    this._pipeline.setWriteFeed(feed);
  }

  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  async start(ctx: Context): Promise<void> {
    const snapshot = this._metadata.getSpaceControlPipelineSnapshot(this._spaceKey);
    log('load snapshot', { key: this._spaceKey, present: !!snapshot, tf: snapshot?.timeframe });
    if (USE_SNAPSHOTS && snapshot) {
      await this._processSnapshot(snapshot);
    }

    log('starting...');
    await this._pipeline.start();
    // Started strictly after `pipeline.start()`: a consumer that races the start can obtain the
    // iterator's generator before it is running — the generator then finishes immediately and
    // polling it spins the microtask queue, starving the thread (boot wedge).
    setTimeout(async () => {
      void this._consumePipeline(ctx);
    });
    log('started');
  }

  private async _processSnapshot(snapshot: ControlPipelineSnapshot): Promise<void> {
    await this._pipeline.setCursor(toTimeframe(snapshot.timeframe));

    for (const message of snapshot.messages ?? []) {
      invariant(message.credential, 'Snapshot entry carries no credential.');
      const result = await this._spaceStateMachine.process(message.credential, {
        sourceFeed: requirePublicKey(message.feedKey),
        skipVerification: true,
      });

      if (!result) {
        log.warn('credential processing failed from snapshot', { message });
      }
    }
  }

  private async _saveSnapshot(): Promise<void> {
    await this._pipeline.pause();
    const snapshot: ControlPipelineSnapshot = create(ControlPipelineSnapshotSchema, {
      timeframe: fromTimeframe(this._pipeline.state.timeframe),
      // A snapshot replays into the feed pipeline, so an entry with no source feed has no place in it.
      messages: this._spaceStateMachine.credentialEntries.flatMap((entry) =>
        entry.sourceFeed
          ? [
              create(ControlPipelineSnapshot_ControlMessageSchema, {
                feedKey: fromPublicKey(entry.sourceFeed),
                credential: entry.credential,
              }),
            ]
          : [],
      ),
    });
    await this._pipeline.unpause();

    log('save snapshot', { key: this._spaceKey, snapshot: getSnapshotLoggerContext(snapshot) });
    await this._metadata.setSpaceControlPipelineSnapshot(this._spaceKey, snapshot);
  }

  private async _consumePipeline(ctx: Context): Promise<void> {
    for await (const msg of this._pipeline.consume()) {
      try {
        await this._processMessage(ctx, msg);
      } catch (err: any) {
        log.catch(err);
      }
    }
  }

  @trace.span({ showInBrowserTimeline: true, showInRemoteTracing: false })
  private async _processMessage(ctx: Context, msg: FeedMessageBlock): Promise<void> {
    log('processing', { key: msg.feedKey, seq: msg.seq });
    if (msg.data.payload?.payload.case === 'credential') {
      const credential = msg.data.payload.payload.value.credential;
      invariant(credential, 'Credentials message is empty.');
      const timer = tracer.mark('dxos.echo.pipeline.control');
      const result = await this._spaceStateMachine.process(credential, {
        sourceFeed: PublicKey.from(msg.feedKey),
      });

      timer.end();
      if (!result) {
        log.warn('processing failed', { msg });
      } else {
        await this._noteTargetStateIfNeeded(this._pipeline.state.pendingTimeframe);
      }

      this._snapshotTask.schedule();
    }
  }

  private async _noteTargetStateIfNeeded(timeframe: Timeframe): Promise<void> {
    // TODO(dmaretskyi): Replace this with a proper debounce/throttle.

    if (Date.now() - this._lastTimeframeSaveTime > TIMEFRAME_SAVE_DEBOUNCE_INTERVAL) {
      this._lastTimeframeSaveTime = Date.now();

      await this._saveTargetTimeframe(timeframe);
    }
  }

  async stop(): Promise<void> {
    log('stopping...');
    await this._ctx.dispose();
    await this._pipeline.stop();
    await this._saveTargetTimeframe(this._pipeline.state.timeframe);
    log('stopped');
  }

  private async _saveTargetTimeframe(timeframe: Timeframe): Promise<void> {
    try {
      const newTimeframe = Timeframe.merge(this._targetTimeframe ?? new Timeframe(), timeframe);
      await this._metadata.setSpaceControlLatestTimeframe(this._spaceKey, newTimeframe);
      this._targetTimeframe = newTimeframe;
    } catch (err: any) {
      log(err);
    }
  }
}

const getSnapshotLoggerContext = (snapshot: ControlPipelineSnapshot) => {
  return snapshot.messages?.map((msg) => ({
    issuer: msg.credential?.issuer,
    subject: msg.credential?.subject?.id,
    type: msg.credential?.subject?.assertion?.typeUrl,
  }));
};
