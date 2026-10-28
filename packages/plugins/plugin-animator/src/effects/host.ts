//
// Copyright 2026 DXOS.org
//

//
// The page's side of the effect runtime: compiles each effect revision once, keeps the worker's shot (bindings and
// jobs) current, and asks it for frames, one at a time and always the latest time asked for. Without a worker it runs
// the same core in-process (tests, a headless check).
//

import { type ModuleCompiler } from '@dxos/animation';

import { type AnimatorCapabilities } from '#types';

import { type CoreRequest, type CoreResponse, EffectCore, effectFrame } from './core.ts';
import { type BindingTrack, type EffectJob } from './types.ts';

/** The frames of a shot's effects at one time in the shot. */
export type EffectFrames = { t: number; frames: AnimatorCapabilities.EffectFrame[] };

export type EffectHostOptions = {
  compile: ModuleCompiler;
  /** A worker running `effects/worker.ts`; without one, effects run in-process. */
  createWorker?: () => Worker;
  onFrames: (frames: EffectFrames) => void;
};

/** What the host runs: the shot's bindings, its jobs, and each job's source by module key. */
export type EffectShot = { binding: BindingTrack; jobs: EffectJob[]; sources: Readonly<Record<string, string>> };

type Backend = { send: (request: CoreRequest) => void; close: () => void };

export class EffectHost {
  readonly #options: EffectHostOptions;
  readonly #backend: Backend;
  readonly #waiting = new Map<number, { resolve: (response: CoreResponse) => void; reject: (error: Error) => void }>();
  readonly #compiled = new Map<string, Promise<string[] | undefined>>();
  #shot: EffectShot | undefined;
  #sent: EffectShot | undefined;
  #wanted: number | undefined;
  #busy = false;
  #next = 0;
  #closed = false;

  constructor(options: EffectHostOptions) {
    this.#options = options;
    const receive = (response: CoreResponse) => {
      this.#waiting.get(response.id)?.resolve(response);
      this.#waiting.delete(response.id);
    };
    const worker = options.createWorker?.();
    if (worker) {
      worker.addEventListener('message', (event: MessageEvent<CoreResponse>) => receive(event.data));
      // A worker that fails to load or crashes answers nothing: every waiting frame fails with the reason.
      worker.addEventListener('error', (event) => {
        const reason = new Error(event.message || 'The effect worker failed.');
        for (const { reject } of this.#waiting.values()) {
          reject(reason);
        }
        this.#waiting.clear();
      });
      this.#backend = { send: (request) => worker.postMessage(request), close: () => worker.terminate() };
    } else {
      const core = new EffectCore();
      this.#backend = {
        // Answered on a later turn, as a worker would, so the two behave alike.
        send: (request) => {
          const response = core.handle(request);
          if (response) {
            queueMicrotask(() => receive(response));
          }
        },
        close: () => {},
      };
    }
  }

  /** The shot to run; a new object (by identity) is sent to the worker before the next frame. */
  update(shot: EffectShot): void {
    this.#shot = shot;
  }

  /** Asks for the frames at `t` seconds into the shot; a request made while one is in flight replaces any waiting. */
  request(t: number): void {
    this.#wanted = t;
    if (!this.#busy) {
      void this.#pump();
    }
  }

  dispose(): void {
    this.#closed = true;
    this.#backend.close();
    this.#waiting.clear();
  }

  async #pump(): Promise<void> {
    this.#busy = true;
    try {
      while (this.#wanted !== undefined && !this.#closed) {
        const t = this.#wanted;
        this.#wanted = undefined;
        // A frame that cannot be computed pauses every effect with the reason, rather than leaving the layer waiting.
        const frames = await this.#frame(t).catch((error) => this.#failed(t, error));
        if (frames && !this.#closed) {
          this.#options.onFrames(frames);
        }
      }
    } finally {
      this.#busy = false;
    }
  }

  async #frame(t: number): Promise<EffectFrames | undefined> {
    const shot = this.#shot;
    if (!shot) {
      return undefined;
    }
    const failed: AnimatorCapabilities.EffectFrame[] = [];
    const jobs: EffectJob[] = [];
    for (const job of shot.jobs) {
      const source = shot.sources[job.key];
      const errors = source === undefined ? [`No effect ${job.key}.`] : await this.#compile(job.key, source);
      if (errors) {
        if (t >= job.start && t <= job.end) {
          failed.push(paused(job, errors.join('\n')));
        }
        continue;
      }
      jobs.push(job);
    }
    if (this.#sent !== shot) {
      this.#sent = shot;
      this.#backend.send({ type: 'shot', binding: shot.binding, jobs });
    }
    const id = this.#next++;
    const response = await new Promise<CoreResponse>((resolve, reject) => {
      this.#waiting.set(id, { resolve, reject });
      this.#backend.send({ type: 'frame', id, t });
    });
    return { t, frames: [...response.frames, ...failed] };
  }

  #failed(t: number, error: unknown): EffectFrames {
    const message = error instanceof Error ? error.message : String(error);
    const jobs = this.#shot?.jobs ?? [];
    return { t, frames: jobs.filter((job) => t >= job.start && t <= job.end).map((job) => paused(job, message)) };
  }

  /** Compiles and loads a revision once; resolves to its errors, if any. */
  #compile(key: string, source: string): Promise<string[] | undefined> {
    let compiled = this.#compiled.get(key);
    if (!compiled) {
      compiled = this.#options.compile(source).then((result) => {
        if (result.errors) {
          return result.errors;
        }
        this.#backend.send({ type: 'load', key, code: result.code });
        return undefined;
      });
      this.#compiled.set(key, compiled);
    }
    return compiled;
  }
}

const paused = (job: EffectJob, message: string): AnimatorCapabilities.EffectFrame =>
  effectFrame(job.instance, job.renderer, [], { state: 'paused', reason: 'error', message });
