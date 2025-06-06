//
// Copyright 2025 DXOS.org
//

import { DeferredTask, Event, sleep } from '@dxos/async';
import { Resource } from '@dxos/context';

import { monitorAudioLevel } from './util';

const NOT_SPEAKING_AFTER = 500; // [ms]
const START_SPEAKING_THRESHOLD = 0.05;
const CONTINUE_SPEAKING_THRESHOLD = 0.02;
const MIN_EVENT_INTERVAL = 100; // [ms]

export class SpeakingMonitor extends Resource {
  /**
   * Event that is emitted when the user starts or stops speaking.
   * It is debounced to prevent rapid state changes.
   */
  public readonly speakingChanged = new Event<boolean>();

  /**
   * Real state of the user speaking.
   */
  private _isSpeaking = false;
  private _lastEventTime = 0;
  private _deferredUpdate?: DeferredTask | undefined;

  constructor(private readonly _mediaStreamTrack: MediaStreamTrack) {
    super();
  }

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  protected override async _open(): Promise<void> {
    this._deferredUpdate = new DeferredTask(this._ctx, async () => this._emitSpeakingChanged());

    let timeout: NodeJS.Timeout | undefined;
    const cleanup = monitorAudioLevel({
      mediaStreamTrack: this._mediaStreamTrack,
      onMeasure: (vol) => {
        // Once the user has been determined to be speaking, we want
        // to lower the threshold because speech patterns don't always
        // kick up above 0.05.
        const audioLevelAboveThreshold =
          vol > (this._isSpeaking ? CONTINUE_SPEAKING_THRESHOLD : START_SPEAKING_THRESHOLD);
        if (audioLevelAboveThreshold) {
          // User is still speaking, clear timeout & reset.
          clearTimeout(timeout);
          timeout = undefined;
          if (!this._isSpeaking) {
            this._isSpeaking = true;
            this._deferredUpdate?.schedule();
          }
        } else if (timeout === undefined) {
          // User is not speaking and timeout is not set.
          timeout = setTimeout(() => {
            this._isSpeaking = false;
            timeout = undefined;
            this._deferredUpdate?.schedule();
          }, NOT_SPEAKING_AFTER);
        }
      },
    });
    this._ctx.onDispose(() => {
      cleanup();
      clearTimeout(timeout);
    });
  }

  /**
   * Emits the speaking changed event with debouncing based on timing.
   */
  private async _emitSpeakingChanged(): Promise<void> {
    const timeSinceLastEvent = Date.now() - this._lastEventTime;
    const timeToNextEvent = MIN_EVENT_INTERVAL - timeSinceLastEvent;
    if (timeToNextEvent > 0) {
      await sleep(timeToNextEvent);
    }
    this._lastEventTime = Date.now();
    this.speakingChanged.emit(this._isSpeaking);
  }
}
