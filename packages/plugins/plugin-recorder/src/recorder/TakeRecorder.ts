//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { log } from '@dxos/log';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';

import { type RecorderCapabilities, type RecorderSettings, Take } from '#types';

import { PREFERRED_MICROPHONE, audioConstraints, pickDevice } from '../audio/devices.ts';
import { type Segment, Session } from '../audio/session.ts';
import { extension } from './save-take.ts';

const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
const VIDEO_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];

/** Seconds counted in before recording begins. */
export const COUNT_IN = 3;

/** MediaRecorder flushes a chunk this often (ms), so a failure loses at most this much. */
const TIMESLICE = 1000;

/** The first type this browser records, else its default. */
const pickMimeType = (types: string[]): string | undefined => types.find((type) => MediaRecorder.isTypeSupported(type));

export type SaveTake = (props: { slide: Presentation.Slide; name: string; data: Blob; log: Take.Log }) => Promise<void>;

export type TakeRecorderProps = {
  registry: Registry.AtomRegistry;
  settings: () => RecorderSettings.Settings;
  save: SaveTake;
  /** A one-slide recording ended because the reader left the slide. */
  onDone?: (presentation: Presentation.Presentation) => void;
};

/** A slide's take being recorded: its own MediaRecorder over the shared stream. */
type Recording = { slide: Presentation.Slide; recorder: MediaRecorder; chunks: Blob[]; startedAt: Date };

/**
 * Records a presentation's voice-over split by slide. The inputs open in the click; a 3-2-1 count-in follows; then
 * each slide shown gets its own `MediaRecorder` over the same stream, so every slide read is a self-contained take of
 * that slide. A take that fails to save is kept in memory as pending.
 */
export class TakeRecorder implements RecorderCapabilities.Recorder {
  readonly state = Atom.make<RecorderCapabilities.RecorderState>({ status: 'idle', pending: [] }).pipe(Atom.keepAlive);

  readonly #registry: Registry.AtomRegistry;
  readonly #settings: () => RecorderSettings.Settings;
  readonly #save: SaveTake;
  readonly #onDone?: (presentation: Presentation.Presentation) => void;
  /** Pending takes' slides, kept out of the state atom since they are live objects. */
  readonly #pendingSlides = new Map<string, Presentation.Slide>();
  /** Pending takes being saved again; a second retry would save the take twice, and a discard would lose it mid-save. */
  readonly #retrying = new Set<string>();

  #context?: AudioContext;
  #analyser?: AnalyserNode;
  #streams: MediaStream[] = [];
  #stream?: MediaStream;
  #mimeType?: string;
  #device?: string;
  #source: Take.VideoSource = 'none';
  #presentation?: Presentation.Presentation;
  #session = new Session();
  #sessionId?: string;
  #startedAt = 0;
  #countdown?: ReturnType<typeof setInterval>;
  /** The slide on screen, so the count-in knows where recording begins. */
  #onScreen?: RecorderCapabilities.SlideMark;
  #recording?: Recording;

  constructor({ registry, settings, save, onDone }: TakeRecorderProps) {
    this.#registry = registry;
    this.#settings = settings;
    this.#save = save;
    this.#onDone = onDone;
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

  async start({ presentation, slide }: RecorderCapabilities.RecordScope): Promise<boolean> {
    if (this.#current.status !== 'idle') {
      return false;
    }

    // Chrome starts an AudioContext suspended unless it is created inside the click, so this precedes every await.
    const context = new AudioContext();
    this.#context = context;
    const settings = this.#settings();
    const source = settings.videoSource ?? 'none';
    this.#update({
      status: 'starting',
      presentationId: presentation.id,
      slideId: slide?.id,
      source,
      error: undefined,
    });

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

      this.#stream = new MediaStream([...(video?.getVideoTracks() ?? []), ...audio.getAudioTracks()]);
      this.#mimeType = pickMimeType(video ? VIDEO_TYPES : AUDIO_TYPES);
      // Ending the browser's screen share ends the recording; a share ended during the prompts above fired no event.
      const videoTrack = video?.getVideoTracks()[0];
      if (videoTrack?.readyState === 'ended') {
        throw new Error('The screen share ended before recording started.');
      }
      // Only while this capture is the live one, so a stale track cannot stop a later recording.
      videoTrack?.addEventListener('ended', () => {
        if (this.#stream?.getVideoTracks().includes(videoTrack)) {
          this.stop();
        }
      });
      this.#presentation = presentation;
      this.#source = source;
      this.#session = new Session({ slideId: slide?.id });
      this.#sessionId = crypto.randomUUID();
      this.#onScreen = undefined;
      this.#countIn();
      return true;
    } catch (err) {
      log.catch(err);
      this.#release();
      this.#update({
        status: 'idle',
        presentationId: undefined,
        slideId: undefined,
        slide: undefined,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /** Counts down from {@link COUNT_IN}, then records from the slide on screen. */
  #countIn(): void {
    let count = COUNT_IN;
    this.#update({ status: 'counting', count });
    this.#countdown = setInterval(() => {
      count -= 1;
      if (count > 0) {
        this.#update({ count });
        return;
      }
      clearInterval(this.#countdown);
      this.#countdown = undefined;
      this.#startedAt = performance.now();
      this.#update({ status: 'recording', count: undefined, startedAt: this.#startedAt });
      if (this.#onScreen) {
        this.#apply(this.#onScreen);
      }
    }, 1000);
  }

  mark(mark: RecorderCapabilities.SlideMark): void {
    const { status } = this.#current;
    if (status === 'counting') {
      this.#onScreen = mark;
    } else if (status === 'recording') {
      this.#apply(mark);
    }
  }

  #apply(mark: RecorderCapabilities.SlideMark): void {
    const at = this.#clock();
    const { closed, opened, done } = this.#session.mark(mark, at);
    if (closed) {
      this.#end(closed);
    }
    if (opened && mark.slide) {
      this.#begin(mark.slide);
    }
    if (done) {
      const presentation = this.#presentation;
      this.#finish();
      if (presentation) {
        this.#onDone?.(presentation);
      }
    }
  }

  /** Starts the take of `slide`. */
  #begin(slide: Presentation.Slide): void {
    if (!this.#stream) {
      return;
    }
    const recorder = new MediaRecorder(this.#stream, this.#mimeType ? { mimeType: this.#mimeType } : undefined);
    const recording: Recording = { slide, recorder, chunks: [], startedAt: new Date() };
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recording.chunks.push(event.data);
      }
    };
    recorder.start(TIMESLICE);
    this.#recording = recording;
    this.#update({ slide: { id: slide.id, startedAt: performance.now(), duration: slide.duration } });
  }

  /** Ends the take of the segment's slide and saves it once its bytes are flushed. */
  #end(segment: Segment): void {
    const recording = this.#recording;
    this.#recording = undefined;
    if (!recording || recording.slide.id !== segment.id) {
      return;
    }
    const takeLog: Take.Log = {
      duration: segment.end - segment.start,
      steps: segment.steps,
      source: this.#source,
      ...(this.#device ? { device: this.#device } : {}),
      ...(this.#sessionId ? { session: this.#sessionId } : {}),
    };
    const name = Take.makeName(recording.startedAt);
    recording.recorder.onstop = () =>
      void this.#store({
        slide: recording.slide,
        name,
        data: new Blob(recording.chunks, { type: recording.recorder.mimeType || this.#mimeType }),
        log: takeLog,
      });
    recording.recorder.stop();
  }

  async #store(take: { slide: Presentation.Slide; name: string; data: Blob; log: Take.Log }): Promise<void> {
    try {
      await this.#save(take);
    } catch (err) {
      log.catch(err);
      // Names resolve to the second, so two slides read within one second share a name.
      const id = crypto.randomUUID();
      this.#pendingSlides.set(id, take.slide);
      this.#update({
        pending: [
          ...this.#current.pending,
          {
            id,
            name: take.name,
            slideId: take.slide.id,
            data: take.data,
            log: take.log,
            error: err instanceof Error ? err.message : String(err),
          },
        ],
      });
    }
  }

  stop(): void {
    const { status } = this.#current;
    if (status === 'recording') {
      const last = this.#session.finish(this.#clock());
      if (last) {
        this.#end(last);
      }
    }
    if (status === 'counting' || status === 'recording') {
      this.#finish();
    }
  }

  /** Closes the inputs; a take still flushing keeps its own recorder until it stops. */
  #finish(): void {
    clearInterval(this.#countdown);
    this.#countdown = undefined;
    // The last take's recorder stops asynchronously; the tracks end after it has flushed.
    const streams = this.#streams;
    const context = this.#context;
    setTimeout(() => {
      streams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
      void context?.close();
    }, TIMESLICE);
    this.#streams = [];
    this.#context = undefined;
    this.#analyser = undefined;
    this.#stream = undefined;
    this.#presentation = undefined;
    this.#update({
      status: 'idle',
      count: undefined,
      presentationId: undefined,
      slideId: undefined,
      startedAt: undefined,
      slide: undefined,
    });
  }

  #release(): void {
    this.#streams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
    this.#streams = [];
    void this.#context?.close();
    this.#context = undefined;
    this.#analyser = undefined;
    this.#stream = undefined;
  }

  async retry(id: string): Promise<void> {
    const take = this.#current.pending.find((take) => take.id === id);
    const slide = this.#pendingSlides.get(id);
    if (!take || !slide || this.#retrying.has(id)) {
      return;
    }
    this.#retrying.add(id);
    try {
      await this.#save({ slide, name: take.name, data: take.data, log: take.log });
      this.#retrying.delete(id);
      this.discard(id);
    } catch (err) {
      log.catch(err);
      this.#update({
        pending: this.#current.pending.map((pending) =>
          pending.id === id ? { ...pending, error: err instanceof Error ? err.message : String(err) } : pending,
        ),
      });
    } finally {
      this.#retrying.delete(id);
    }
  }

  download(id: string): void {
    const take = this.#current.pending.find((take) => take.id === id);
    if (take) {
      downloadBlob(take.data, `${take.name}.${extension(take.data.type)}`);
    }
  }

  discard(id: string): void {
    if (this.#retrying.has(id)) {
      return;
    }
    this.#pendingSlides.delete(id);
    this.#update({ pending: this.#current.pending.filter((take) => take.id !== id) });
  }
}

/** Saves `data` as a file through the browser's download. */
export const downloadBlob = (data: Blob, name: string): void => {
  const url = URL.createObjectURL(data);
  downloadUrl(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Saves the resource at `url` as a file through the browser's download. */
export const downloadUrl = (url: string, name: string): void => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
};
