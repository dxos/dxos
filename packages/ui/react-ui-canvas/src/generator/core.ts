//
// Copyright 2026 DXOS.org
//

//
// What the generator worker does, as a plain class, so the worker (`worker.ts`) and a headless run in-process share
// it: it holds the loaded modules, the scene, and one runner per generator node, and answers frame requests.
//

import { type RunnerOptions, type Timeline, hashSeed } from '@dxos/animation';
import { type NodeId, isGeneratorNode } from '@dxos/scene';

import { type View } from '../model/index.ts';
import { loadGenerator } from './compile.ts';
import { GeneratorRunner } from './runner.ts';
import { type GeneratorFrame, type GeneratorModule } from './types.ts';

/** A generator node to draw: which compiled module (by key) and its parameter schema. */
export type GeneratorFrameNode = { id: NodeId; key: string; schema?: Record<string, unknown> };

export type CoreRequest =
  | { type: 'load'; key: string; code: string }
  | { type: 'scene'; scene: View; timeline?: Timeline }
  | { type: 'frame'; id: number; t: number; nodes: GeneratorFrameNode[] };

export type CoreResponse = { type: 'frame'; id: number; t: number; frames: Record<NodeId, GeneratorFrame> };

export class GeneratorCore {
  readonly #modules = new Map<string, GeneratorModule | Error>();
  readonly #runners = new Map<NodeId, { key: string; runner: GeneratorRunner }>();
  readonly #options: Omit<RunnerOptions, 'seed'>;
  #scene: View | undefined;
  #timeline: Timeline | undefined;

  constructor(options: Omit<RunnerOptions, 'seed'> = {}) {
    this.#options = options;
  }

  handle(request: CoreRequest): CoreResponse | undefined {
    switch (request.type) {
      case 'load': {
        try {
          this.#modules.set(request.key, loadGenerator(request.code));
        } catch (error) {
          this.#modules.set(request.key, error instanceof Error ? error : new Error(String(error)));
        }
        return undefined;
      }
      case 'scene': {
        // An edit to the scene can move what a generator is bound to: every run starts over from its checkpoints' end.
        this.#scene = request.scene;
        this.#timeline = request.timeline;
        for (const { runner } of this.#runners.values()) {
          runner.reset();
        }
        return undefined;
      }
      case 'frame': {
        const frames: Record<NodeId, GeneratorFrame> = {};
        const scene = this.#scene;
        for (const node of request.nodes) {
          const module = this.#modules.get(node.key);
          if (!scene || !module) {
            continue;
          }
          if (module instanceof Error) {
            frames[node.id] = {
              shapes: [],
              status: { state: 'paused', reason: 'error', message: module.message },
              stepMs: 0,
            };
            continue;
          }
          frames[node.id] = this.#runner(node, module, scene).frame(request.t, {
            scene,
            timeline: this.#timeline,
            node: node.id,
            schema: node.schema,
          });
        }
        return { type: 'frame', id: request.id, t: request.t, frames };
      }
    }
  }

  #runner(node: GeneratorFrameNode, module: GeneratorModule, scene: View): GeneratorRunner {
    const existing = this.#runners.get(node.id);
    if (existing?.key === node.key) {
      return existing.runner;
    }
    const element = scene.nodes[node.id];
    const seed = element && isGeneratorNode(element) && element.seed !== undefined ? element.seed : hashSeed(node.id);
    const runner = new GeneratorRunner(module, { ...this.#options, seed });
    this.#runners.set(node.id, { key: node.key, runner });
    return runner;
  }
}
