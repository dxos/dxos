//
// Copyright 2026 DXOS.org
//

//
// The page's side of the generator runtime: compiles each generator once per version, keeps the worker's scene and
// modules current, and asks it for frames, one at a time and always the latest time asked for. Without a worker it
// runs the same core in-process (a headless check; tests).
//

import { type ModuleCompiler } from '@dxos/animation';
import { type NodeId, isGeneratorNode } from '@dxos/scene';

import { type RenderList2D } from '../model/index.ts';
import { type CoreRequest, type CoreResponse, GeneratorCore, type GeneratorFrameNode } from './core.ts';
import { type GeneratorFrame, type GeneratorSource } from './types.ts';

/** The frames of every generator node of a scene at one time. */
export type GeneratorFrames = { t: number; frames: Record<NodeId, GeneratorFrame> };

export type GeneratorHostOptions = {
  compile: ModuleCompiler;
  /** A worker running `generator/worker.ts`; without one, generators run in-process. */
  createWorker?: () => Worker;
  onFrames: (frames: GeneratorFrames) => void;
};

type Backend = { send: (request: CoreRequest) => void; close: () => void };

/** The key a compiled module is held under: a revision of one generator. */
const moduleKey = (ref: string, version: number) => `${ref}@${version}`;

export class GeneratorHost {
  readonly #options: GeneratorHostOptions;
  readonly #backend: Backend;
  readonly #waiting = new Map<number, (response: CoreResponse) => void>();
  readonly #failing = new Map<number, (error: Error) => void>();
  readonly #compiled = new Map<string, Promise<string[] | undefined>>();
  #scene: RenderList2D | undefined;
  #sentScene: RenderList2D | undefined;
  #sources: Readonly<Record<string, GeneratorSource>> = {};
  #wanted: number | undefined;
  #busy = false;
  #next = 0;
  #closed = false;

  constructor(options: GeneratorHostOptions) {
    this.#options = options;
    const receive = (response: CoreResponse) => {
      this.#waiting.get(response.id)?.(response);
      this.#waiting.delete(response.id);
      this.#failing.delete(response.id);
    };
    const worker = options.createWorker?.();
    if (worker) {
      worker.addEventListener('message', (event: MessageEvent<CoreResponse>) => receive(event.data));
      // A worker that fails to load or crashes answers nothing: every waiting frame fails with the reason.
      worker.addEventListener('error', (event) => {
        const reason = new Error(event.message || 'The generator worker failed.');
        for (const reject of this.#failing.values()) {
          reject(reason);
        }
        this.#waiting.clear();
        this.#failing.clear();
      });
      this.#backend = { send: (request) => worker.postMessage(request), close: () => worker.terminate() };
    } else {
      const core = new GeneratorCore();
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

  /** The scene as drawn and the generators its nodes reference. */
  update(scene: RenderList2D, sources: Readonly<Record<string, GeneratorSource>>): void {
    this.#scene = scene;
    this.#sources = sources;
  }

  /** Asks for the frames at `t`; a request made while one is in flight replaces any still waiting. */
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
        // A frame that cannot be computed (the worker failed, the scene would not clone) pauses every generator with the
        // reason, rather than leaving the layer waiting for an answer that will not come.
        const frames = await this.#frame(t).catch((error) => this.#failed(t, error));
        if (frames && !this.#closed) {
          this.#options.onFrames(frames);
        }
      }
    } finally {
      this.#busy = false;
    }
  }

  async #frame(t: number): Promise<GeneratorFrames | undefined> {
    const scene = this.#scene;
    if (!scene) {
      return undefined;
    }
    const nodes: GeneratorFrameNode[] = [];
    const failed: Record<NodeId, GeneratorFrame> = {};
    for (const node of Object.values(scene.nodes)) {
      if (!isGeneratorNode(node)) {
        continue;
      }
      const source = this.#sources[node.generator];
      if (!source) {
        failed[node.id] = paused(`No generator ${node.generator}.`);
        continue;
      }
      const key = moduleKey(node.generator, source.version);
      const errors = await this.#compile(key, source);
      if (errors) {
        failed[node.id] = paused(errors.join('\n'));
        continue;
      }
      nodes.push({ id: node.id, key, schema: source.params });
    }
    if (this.#sentScene !== scene) {
      this.#sentScene = scene;
      this.#backend.send({ type: 'scene', scene });
    }
    const id = this.#next++;
    const response = await new Promise<CoreResponse>((resolve, reject) => {
      this.#waiting.set(id, resolve);
      this.#failing.set(id, reject);
      this.#backend.send({ type: 'frame', id, t, nodes });
    });
    return { t, frames: { ...response.frames, ...failed } };
  }

  #failed(t: number, error: unknown): GeneratorFrames {
    const message = error instanceof Error ? error.message : String(error);
    const nodes = Object.values(this.#scene?.nodes ?? {}).filter(isGeneratorNode);
    return { t, frames: Object.fromEntries(nodes.map((node) => [node.id, paused(message)])) };
  }

  /** Compiles and loads a revision once; resolves to its errors, if any. */
  #compile(key: string, source: GeneratorSource): Promise<string[] | undefined> {
    let compiled = this.#compiled.get(key);
    if (!compiled) {
      compiled = this.#options.compile(source.source).then((result) => {
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

const paused = (message: string): GeneratorFrame => ({
  shapes: [],
  status: { state: 'paused', reason: 'error', message },
  stepMs: 0,
});
