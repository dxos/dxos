//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { log } from '@dxos/log';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';

import { type RecorderCapabilities, type RecorderSettings, type Take } from '#types';

import { PREFERRED_MICROPHONE, audioConstraints, pickDevice } from '../audio/devices.ts';
import { type SlideMark, Timeline } from '../audio/timeline.ts';

const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
const VIDEO_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];

/** MediaRecorder flushes a chunk this often (ms), so a failure loses at most this much. */
const TIMESLICE = 1000;

/** The first type this browser records, else its default. */
const pickMimeType = (types: string[]): string | undefined => types.find((type) => MediaRecorder.isTypeSupported(type));

/** Takes are named by the time they started, so a name is never reused. */
export const takeName = (date = new Date()): string =>
  `take-${date.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}`;

export type SaveTake = (props: {
  presentation: Presentation.Presentation;
  name: string;
  data: Blob;
  log: Take.Log;
}) => Promise<void>;

export type TakeRecorderProps = {
  registry: Registry.AtomRegistry;
  settings: () => RecorderSettings.Settings;
  save: SaveTake;
};

/**
 * Records takes: acquires the microphone (and a screen or camera when set), runs a `MediaRecorder` over them, logs
 * the slides shown, and saves the take when it stops. A take that fails to save is kept in memory as pending.
 */
export class TakeRecorder implements RecorderCapabilities.Recorder {
  readonly state = Atom.make<RecorderCapabilities.RecorderState>({ status: 'idle', pending: [] }).pipe(Atom.keepAlive);

  readonly #registry: Registry.AtomRegistry;
  readonly #settings: () => RecorderSettings.Settings;
  readonly #save: SaveTake;

  #context?: AudioContext;
  #analyser?: AnalyserNode;
  #streams: MediaStream[] = [];
  #recorder?: MediaRecorder;
  #presentation?: Presentation.Presentation;
  #timeline = new Timeline();
  #startedAt = 0;
  #device?: string;
  #source: Take.VideoSource = 'none';
  /** The log of the take being stopped, until its bytes arrive. */
  #stoppingLog?: Take.Log;
  /** Pending takes' presentations, kept out of the state atom since they are live objects. */
  readonly #pendingPresentations = new Map<string, Presentation.Presentation>();

  constructor({ registry, settings, save }: TakeRecorderProps) {
    this.#registry = registry;
    this.#settings = settings;
    this.#save = save;
  }

  get analyser(): AnalyserNode | undefined {
    return this.#analyser;
  }

  get #current(): RecorderCapabilities.RecorderState {
    return this.#registry.get(this.state);
  }

  #update(update: Partial<RecorderCapabilities.RecorderState>): void {
    this.#registry.set(this.state, { ...this.#current, ...update });
  }

  #clock(): number {
    return (performance.now() - this.#startedAt) / 1000;
  }

  async start(presentation: Presentation.Presentation): Promise<boolean> {
    if (this.#current.status !== 'idle') {
      return false;
    }

    // Chrome starts an AudioContext suspended unless it is created inside the click, so this precedes every await.
    const context = new AudioContext();
    this.#context = context;
    const settings = this.#settings();
    const source = settings.videoSource ?? 'none';
    this.#update({ status: 'starting', presentationId: presentation.id, source, error: undefined });

    try {
      // Screen capture needs the click's activation, so it is requested before the microphone prompt can use it up.
      const video =
        source === 'screen'
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
          : source === 'camera'
            ? await navigator.mediaDevices.getUserMedia({
                video: settings.videoInput ? { deviceId: { exact: settings.videoInput } } : true,
              })
            : undefined;
      if (video) {
        this.#streams.push(video);
      }

      const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'audioinput');
      const audio = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints(pickDevice(inputs, settings.audioInput, PREFERRED_MICROPHONE)),
      });
      this.#streams.push(audio);
      this.#device = audio.getAudioTracks()[0]?.label;

      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      context.createMediaStreamSource(audio).connect(analyser);
      await context.resume();
      this.#analyser = analyser;

      const stream = new MediaStream([...(video?.getVideoTracks() ?? []), ...audio.getAudioTracks()]);
      const mimeType = pickMimeType(video ? VIDEO_TYPES : AUDIO_TYPES);
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => void this.#finish(new Blob(chunks, { type: recorder.mimeType || mimeType }));
      // Ending the browser's screen share ends the take.
      video?.getVideoTracks()[0]?.addEventListener('ended', () => this.stop());

      this.#recorder = recorder;
      this.#presentation = presentation;
      this.#source = source;
      this.#timeline = new Timeline();
      recorder.start(TIMESLICE);
      this.#startedAt = performance.now();
      this.#update({ status: 'recording', startedAt: this.#startedAt });
      return true;
    } catch (err) {
      log.catch(err);
      this.#release();
      this.#update({
        status: 'idle',
        presentationId: undefined,
        slide: undefined,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  mark(slide: SlideMark): void {
    const state = this.#current;
    if (state.status !== 'recording') {
      return;
    }
    this.#timeline.mark(slide, this.#clock());
    if (state.slide?.id !== slide.id || state.slide.duration !== slide.duration) {
      this.#update({
        slide: {
          id: slide.id,
          startedAt: state.slide?.id === slide.id ? state.slide.startedAt : performance.now(),
          duration: slide.duration,
        },
      });
    }
  }

  stop(): void {
    if (this.#current.status !== 'recording' || !this.#recorder) {
      return;
    }
    this.#stoppingLog = {
      ...this.#timeline.finish(this.#clock()),
      source: this.#source,
      ...(this.#device ? { device: this.#device } : {}),
    };
    this.#update({ status: 'saving', slide: undefined });
    this.#recorder.stop();
  }

  async #finish(data: Blob): Promise<void> {
    const presentation = this.#presentation;
    const takeLog = this.#stoppingLog;
    this.#release();
    if (!presentation || !takeLog) {
      this.#update({ status: 'idle', presentationId: undefined });
      return;
    }

    const name = takeName(new Date(performance.timeOrigin + this.#startedAt));
    try {
      await this.#save({ presentation, name, data, log: takeLog });
      this.#update({ status: 'idle', presentationId: undefined });
    } catch (err) {
      log.catch(err);
      this.#update({
        status: 'idle',
        presentationId: undefined,
        pending: [
          ...this.#current.pending,
          {
            id: name,
            name,
            presentationId: presentation.id,
            data,
            log: takeLog,
            error: err instanceof Error ? err.message : String(err),
          },
        ],
      });
      this.#pendingPresentations.set(name, presentation);
    }
  }

  async retry(id: string): Promise<void> {
    const take = this.#current.pending.find((take) => take.id === id);
    const presentation = this.#pendingPresentations.get(id);
    if (!take || !presentation) {
      return;
    }
    try {
      await this.#save({ presentation, name: take.name, data: take.data, log: take.log });
      this.discard(id);
    } catch (err) {
      log.catch(err);
      this.#update({
        pending: this.#current.pending.map((pending) =>
          pending.id === id ? { ...pending, error: err instanceof Error ? err.message : String(err) } : pending,
        ),
      });
    }
  }

  download(id: string): void {
    const take = this.#current.pending.find((take) => take.id === id);
    if (!take) {
      return;
    }
    const url = URL.createObjectURL(take.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${take.name}.${take.data.type.includes('mp4') ? 'mp4' : 'webm'}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  discard(id: string): void {
    this.#pendingPresentations.delete(id);
    this.#update({ pending: this.#current.pending.filter((take) => take.id !== id) });
  }

  #release(): void {
    for (const stream of this.#streams) {
      stream.getTracks().forEach((track) => track.stop());
    }
    this.#streams = [];
    void this.#context?.close();
    this.#context = undefined;
    this.#analyser = undefined;
    this.#recorder = undefined;
    this.#presentation = undefined;
    this.#stoppingLog = undefined;
  }
}
