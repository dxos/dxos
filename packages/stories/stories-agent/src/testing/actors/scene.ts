//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { Actor, type ActorBinding } from './actor.ts';
import { VirtualClock } from './clock.ts';
import { type ActorFlow, runFlow } from './flow.ts';

declare global {
  interface Window {
    // The seek contract `tools/autocue/showcase/render.mjs` drives (shared with the autocue Grid).
    grid?: { total: number; seek: (ms: number) => Promise<void> };
    /** The running scene, for inspecting a recording from the console. */
    actorScene?: Scene;
  }
}

export type ScenePhase = 'joining' | 'ready' | 'playing' | 'done';

export type SceneMode = 'realtime' | 'stepped';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * One scripted scene: a client per actor on an in-memory network, a space the first actor creates and
 * the rest join by invitation, and the flow that runs once every actor's article is mounted.
 */
export class Scene {
  readonly clock = new VirtualClock();
  readonly services;
  /** Each actor's client once it has joined, for inspecting the scene from the console. */
  readonly clients: Client[] = [];
  /** Steps that failed, as `actor › step: error`. */
  readonly errors: string[] = [];

  #hostSpace = new Trigger<Space>();
  #spaceId?: SpaceId;
  #bindings = new Map<number, ActorBinding>();
  #phase: ScenePhase = 'joining';
  #listeners = new Set<() => void>();
  #disposed = false;
  #playing = false;
  /** The seek contract handed to the frame renderer in stepped mode. */
  readonly #seeker: NonNullable<Window['grid']>;

  constructor(
    readonly flow: ActorFlow,
    readonly mode: SceneMode,
  ) {
    const builder = new TestBuilder();
    this.services = flow.actors.map(() => builder.createLocalClientServices());
    this.#seeker = {
      total: flow.duration,
      seek: async (ms) => {
        await this.clock.advanceTo(ms);
        await this.#replicated();
        await nextFrame();
        await nextFrame();
      },
    };
  }

  /** Each actor's editor, by actor index, for the console. */
  get views() {
    return this.flow.actors.map((_, index) => this.#bindings.get(index)?.view);
  }

  /** A snapshot of where the scene is, for the console. */
  get status() {
    return {
      phase: this.#phase,
      now: Math.round(this.clock.now),
      registered: [...this.#bindings.keys()],
      errors: this.errors,
      texts: [...this.#bindings.values()].map((binding) => binding.view.state.doc.toString()),
    };
  }

  get phase(): ScenePhase {
    return this.#phase;
  }

  get spaceId(): SpaceId | undefined {
    return this.#spaceId;
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /**
   * Gives actor `index`'s client its identity and puts it in the shared space: the first actor creates the
   * space and the document, every other actor joins through a real invitation from the first.
   */
  join = (client: Client, index: number) => {
    const scene = this;
    const spec = this.flow.actors[index];
    return Effect.gen(function* () {
      scene.clients[index] = client;
      yield* Effect.promise(() => client.waitUntilInitialized());
      if (!client.halo.identity.get()) {
        yield* Effect.promise(() =>
          client.halo.createIdentity(
            create(ProfileDocumentSchema, { displayName: spec.name, data: { hue: spec.hue } }),
          ),
        );
      }
      if (!AppSpace.getSettingsSpace(client)) {
        yield* AppSpace.setupIdentitySpaces(client);
      }

      if (index === 0) {
        const space = yield* Effect.promise(() => client.spaces.create({ name: scene.flow.document.name }));
        yield* Effect.promise(() => space.waitUntilReady());
        space.db.add(Markdown.make(scene.flow.document));
        yield* Effect.promise(() => space.db.flush({ indexes: true }));
        scene.#setSpace(space.id);
        scene.#hostSpace.wake(space);
      } else {
        const host = yield* Effect.promise(() => scene.#hostSpace.wait());
        yield* Effect.promise(() => Promise.all(performInvitation({ host, guest: client.spaces })));
        log.info('actor joined', { actor: spec.name, spaceId: host.id });
      }
    });
  };

  /** Called by each actor's article once its editor is mounted; the flow starts when all are. */
  register(index: number, binding: ActorBinding) {
    this.#bindings.set(index, binding);
    if (this.#phase === 'joining' && this.#bindings.size === this.flow.actors.length) {
      this.#setPhase('ready');
      void this.#start();
    }
  }

  /** Attaches the scene to the page; React may detach and re-attach it, so playback resumes here. */
  open() {
    this.#disposed = false;
    window.actorScene = this;
    if (this.#phase === 'playing') {
      this.#attach();
    }
  }

  dispose() {
    this.#disposed = true;
    if (window.actorScene === this) {
      delete window.actorScene;
    }
    if (window.grid === this.#seeker) {
      delete window.grid;
    }
  }

  async #start() {
    const actors = this.flow.actors.map((spec, index) => {
      const binding = this.#bindings.get(index);
      invariant(binding, `actor ${index} has no editor`);
      return new Actor(index, spec, this.clock, binding);
    });
    void runFlow(this.flow, actors, this.clock, ({ actor, step, error }) => {
      this.errors.push(`${actor} › ${step}: ${String(error)}`);
    }).then(() => this.#setPhase('done'));
    this.#setPhase('playing');
    if (!this.#disposed) {
      this.#attach();
    }
  }

  /** Hands time to the renderer (stepped) or to the wall clock (realtime). */
  #attach() {
    if (this.mode === 'stepped') {
      window.grid = this.#seeker;
    } else {
      void this.#play();
    }
  }

  /** Advances the clock with wall time, resuming from where the scene stopped. */
  async #play() {
    if (this.#playing || this.mode !== 'realtime') {
      return;
    }

    this.#playing = true;
    try {
      // A timer rather than rAF, which a hidden tab suspends.
      const start = performance.now() - this.clock.now;
      while (!this.#disposed && (this.#phase !== 'done' || this.clock.now < this.flow.duration)) {
        await new Promise((resolve) => setTimeout(resolve, 16));
        await this.clock.advanceTo(performance.now() - start);
      }
    } finally {
      this.#playing = false;
    }
  }

  /** Waits until every actor's editor shows the same text, so a rendered frame never catches a half-sync. */
  async #replicated(timeout = 3_000) {
    const start = performance.now();
    while (performance.now() - start < timeout) {
      const texts = [...this.#bindings.values()].map((binding) => binding.view.state.doc.toString());
      if (texts.every((text) => text === texts[0])) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    log.warn('actors did not converge before the frame');
  }

  #setSpace(spaceId: SpaceId) {
    this.#spaceId = spaceId;
    this.#notify();
  }

  #setPhase(phase: ScenePhase) {
    this.#phase = phase;
    this.#notify();
  }

  #notify() {
    this.#listeners.forEach((listener) => listener());
  }
}
