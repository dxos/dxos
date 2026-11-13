//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type EditorView } from '@codemirror/view';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Invitation_AuthMethod, Invitation_State, InvitationEncoder } from '@dxos/client/invitations';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { Actor, type ActorBinding } from './actor.ts';
import { VirtualClock } from './clock.ts';
import { type ActorFlow, runFlow } from './flow.ts';

declare global {
  interface Window {
    // The seek contract `tools/autocue/showcase/render.mjs` drives (shared with the autocue Grid).
    grid?: { total: number; seek: (ms: number) => Promise<void> };
    /** The running scene, for inspecting a recording from the console. */
    actorScene?: SceneView;
  }
}

export type ScenePhase = 'joining' | 'ready' | 'playing' | 'done';

export type SceneMode = 'realtime' | 'stepped';

/**
 * What the first actor hands the others when each actor runs in its own browser: the invitation to the space, and
 * the seed's target as JSON (which every step reads).
 */
export type SoloShared = { invitation: string; spaceId: string; target: string };

/** What an actor's view needs of its scene, whatever the scene builds towards. */
export type SceneView = {
  readonly phase: ScenePhase;
  readonly spaceId: SpaceId | undefined;
  /** The name of the document the writers edit. */
  readonly documentName: string;
  subscribe: (listener: () => void) => () => void;
  register: (index: number, binding: ActorBinding) => void;
  /** For the console and tests: each actor's client, document editor, and a snapshot of the scene. */
  readonly clients: Client[];
  readonly views: (EditorView | undefined)[];
  readonly progress: Record<number, string>;
  /** Solo only: the actor this page runs, or undefined when one page runs every actor. */
  readonly solo?: number;
  /** Solo only: what the first actor shares, once it has seeded the space. */
  readonly shared: SoloShared | undefined;
  /** Solo only: hands a guest what the first actor shared, so it can join. */
  accept: (shared: SoloShared) => void;
  /** Records when actor `index` first reached `phase`, in ms since the scene was made. */
  mark: (index: number, phase: string) => void;
  readonly status: {
    phase: ScenePhase;
    now: number;
    registered: number[];
    progress: Record<number, string>;
    timeline: Record<number, Record<string, number>>;
    errors: string[];
    texts: string[];
  };
};

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * One scripted scene: a client per actor on an in-memory network, a space the first actor creates and
 * the rest join by invitation, and the flow that runs once every actor's article is mounted.
 */
export class Scene<T = unknown> implements SceneView {
  readonly clock = new VirtualClock();
  readonly services;
  /** Each actor's client once it has joined, for inspecting the scene from the console. */
  readonly clients: Client[] = [];
  /** Where each actor's view is in mounting, for diagnosing a scene that never starts. */
  readonly progress: Record<number, string> = {};
  /** When each actor first reached each joining phase, for measuring where startup time goes. */
  readonly timeline: Record<number, Record<string, number>> = {};
  readonly #started = performance.now();
  /** Steps that failed, as `actor › step: error`. */
  readonly errors: string[] = [];

  #hostSpace = new Trigger<Space>();
  #shared?: SoloShared;
  #accepted = new Trigger<SoloShared>();
  #spaceId?: SpaceId;
  #bindings = new Map<number, ActorBinding>();
  #phase: ScenePhase = 'joining';
  #listeners = new Set<() => void>();
  #disposed = false;
  /** What the flow's `seed` returned, handed to every step. */
  #target?: { value: T };
  #playing = false;
  /** The seek contract handed to the frame renderer in stepped mode. */
  readonly #seeker: NonNullable<Window['grid']>;

  /**
   * @param solo The one actor this page runs, each in its own browser on a real network; the others' pages share
   *   the space through `shared` and `accept`. Undefined runs every actor here, on an in-memory network.
   */
  constructor(
    readonly flow: ActorFlow<T>,
    readonly mode: SceneMode,
    readonly solo?: number,
  ) {
    const builder = new TestBuilder();
    this.services = solo === undefined ? flow.actors.map(() => builder.createLocalClientServices()) : [];
    this.#seeker = {
      total: flow.duration,
      seek: async (ms) => {
        await this.clock.advanceTo(ms);
        // Solo pages are compared by their driver, which sees every page.
        if (this.solo === undefined) {
          await this.#replicated();
        }
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
      progress: this.progress,
      timeline: this.timeline,
      errors: this.errors,
      texts: this.#texts(),
    };
  }

  get phase(): ScenePhase {
    return this.#phase;
  }

  get documentName(): string {
    return this.flow.document.name;
  }

  get shared(): SoloShared | undefined {
    return this.#shared;
  }

  accept = (shared: SoloShared) => {
    this.#accepted.wake(shared);
  };

  get spaceId(): SpaceId | undefined {
    return this.#spaceId;
  }

  mark = (index: number, phase: string) => {
    const phases = (this.timeline[index] ??= {});
    phases[phase] ??= Math.round(performance.now() - this.#started);
  };

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
      scene.mark(index, 'client');
      yield* Effect.promise(() => client.waitUntilInitialized());
      scene.mark(index, 'initialized');
      if (!client.halo.identity.get()) {
        yield* Effect.promise(() =>
          client.halo.createIdentity(
            create(ProfileDocumentSchema, { displayName: spec.name, data: { hue: spec.hue } }),
          ),
        );
      }
      scene.mark(index, 'identity');
      // The flow's schemas before anything creates objects of them; the client registers its configured types later.
      if (scene.flow.types?.length) {
        yield* Effect.promise(() => client.addTypes([...(scene.flow.types ?? [])]));
      }
      if (!AppSpace.getSettingsSpace(client)) {
        yield* AppSpace.setupIdentitySpaces(client);
      }
      scene.mark(index, 'identity-spaces');

      if (index === 0) {
        const space = yield* Effect.promise(() => client.spaces.create({ name: scene.flow.document.name }));
        yield* Effect.promise(() => space.waitUntilReady());
        scene.mark(index, 'space');
        const seeded = yield* Effect.tryPromise(() => scene.flow.seed({ client, space })).pipe(
          Effect.tapError((error) => Effect.sync(() => scene.errors.push(`seed: ${String(error.cause ?? error)}`))),
        );
        scene.#target = { value: seeded };
        yield* Effect.promise(() => space.db.flush({ indexes: true }));
        scene.mark(index, 'seeded');
        if (scene.solo !== undefined) {
          const invitation = yield* Effect.promise(() =>
            shareSpace(space, (state) => scene.mark(index, `share:${Invitation_State[state]}`)),
          );
          scene.#shared = { invitation, spaceId: space.id, target: JSON.stringify(seeded ?? null) };
          scene.mark(index, 'shared');
        }
        scene.#setSpace(space.id);
        scene.#hostSpace.wake(space);
      } else if (scene.solo !== undefined) {
        const shared = yield* Effect.promise(() => scene.#accepted.wait());
        scene.mark(index, 'inviting');
        yield* Effect.promise(() =>
          joinSpace(client, shared.invitation, (state) => scene.mark(index, `join:${Invitation_State[state]}`)),
        );
        const spaceId = shared.spaceId;
        invariant(SpaceId.isValid(spaceId), 'the host shared no space id');
        scene.#target = { value: JSON.parse(shared.target) };
        const space = yield* Effect.promise(() => spaceOf(client, spaceId));
        scene.mark(index, 'listed');
        yield* Effect.promise(() => space.waitUntilReady());
        scene.mark(index, 'invited');
        scene.#setSpace(spaceId);
      } else {
        const host = yield* Effect.promise(() => scene.#hostSpace.wait());
        scene.mark(index, 'inviting');
        yield* Effect.promise(() => Promise.all(performInvitation({ host, guest: client.spaces })));
        scene.mark(index, 'invited');
        log.info('actor joined', { actor: spec.name, spaceId: host.id });
      }
    }).pipe(
      // A defect while joining otherwise vanishes into the client's startup, leaving the actor joining forever.
      Effect.tapCause((cause) => Effect.sync(() => scene.errors.push(`${spec.name} › join: ${Cause.pretty(cause)}`))),
    );
  };

  /** Called by each actor's article once its editor is mounted; the flow starts when all are. */
  register = (index: number, binding: ActorBinding) => {
    this.#bindings.set(index, binding);
    const expected = this.solo === undefined ? this.flow.actors.length : 1;
    if (this.#phase === 'joining' && this.#bindings.size === expected) {
      this.#setPhase('ready');
      void this.#start();
    }
  };

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
    const indices = this.solo === undefined ? this.flow.actors.map((_, index) => index) : [this.solo];
    const actors = indices.map((index) => {
      const binding = this.#bindings.get(index);
      invariant(binding, `actor ${index} has no editor`);
      return new Actor(index, this.flow.actors[index], this.clock, binding, this.flow.quiet);
    });
    const target = this.#target;
    invariant(target, 'the scene started before its space was seeded');
    void runFlow(this.flow, target.value, actors, this.clock, ({ actor, step, error }) => {
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
  async #replicated(timeout = 10_000) {
    const start = performance.now();
    while (performance.now() - start < timeout) {
      const texts = this.#texts();
      if (texts.every((text) => text === texts[0])) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    log.warn('actors did not converge before the frame');
  }

  /** Every document editor's text, in actor order. */
  #texts(): string[] {
    return [...this.#bindings.values()].flatMap((binding) => (binding.view ? [binding.view.state.doc.toString()] : []));
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

/** Opens a multi-use invitation to `space` that needs no code, and resolves with it encoded once it is listening. */
const shareSpace = (space: Space, onState: (state: Invitation_State) => void): Promise<string> =>
  new Promise((resolve, reject) => {
    const observable = space.share({ authMethod: Invitation_AuthMethod.NONE, multiUse: true });
    observable.subscribe((invitation) => {
      onState(invitation.state);
      if (invitation.state === Invitation_State.CONNECTING) {
        resolve(InvitationEncoder.encode(invitation));
      }
    }, reject);
  });

/** Accepts an encoded invitation and resolves once it has succeeded. */
const joinSpace = (client: Client, code: string, onState: (state: Invitation_State) => void): Promise<void> =>
  new Promise((resolve, reject) => {
    const observable = client.spaces.join(InvitationEncoder.decode(code));
    observable.subscribe((invitation) => {
      onState(invitation.state);
      if (invitation.state === Invitation_State.SUCCESS) {
        resolve();
      }
    }, reject);
  });

/** The space `spaceId` once the client lists it, which can be a moment after its invitation succeeds. */
const spaceOf = (client: Client, spaceId: SpaceId): Promise<Space> =>
  new Promise((resolve) => {
    const listed = client.spaces.get(spaceId);
    if (listed) {
      resolve(listed);
      return;
    }
    // The observable calls back synchronously on subscribe, before `subscription` exists, so that call is skipped.
    let subscription: { unsubscribe: () => void } | undefined;
    subscription = client.spaces.subscribe(() => {
      const space = client.spaces.get(spaceId);
      if (space && subscription) {
        subscription.unsubscribe();
        resolve(space);
      }
    });
  });
