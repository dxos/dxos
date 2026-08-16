//
// Copyright 2026 DXOS.org
//

export type FollowOptions = {
  /** Ceiling on travel speed, px/s. */
  maxSpeed?: number;
  /** Rate the speed ramps up and down, px/s². */
  acceleration?: number;
};

const DEFAULT_MAX_SPEED = 1_600;
const DEFAULT_ACCELERATION = 3_200;

/** Within this distance the follow has arrived; below it the animation would only jitter. */
const ARRIVED = 0.5;

export type VelocityStep = {
  /** Current speed, px/s. */
  velocity: number;
  /** Remaining distance to the target, px. */
  distance: number;
  /** Elapsed time since the last step, seconds. */
  dt: number;
  maxSpeed: number;
  acceleration: number;
};

/**
 * Speed for the next frame of a follow.
 *
 * Ramps up to `maxSpeed` and back down so the travel starts and ends gently rather than jumping.
 * The cap is whichever is lower: the ceiling, or the speed from which the remaining distance can
 * still be shed at `acceleration` (`v = sqrt(2·a·d)`) — that second term is what turns the arrival
 * into a deceleration instead of a stop, and what keeps a growing target at cruise speed.
 *
 * Deceleration is rate-limited exactly as acceleration is, so a single step cannot always brake
 * within the distance the cap implies; over a whole travel it does, and the follow clamps at the
 * target rather than overshooting it.
 */
export const stepVelocity = ({ velocity, distance, dt, maxSpeed, acceleration }: VelocityStep): number => {
  const desired = Math.min(maxSpeed, Math.sqrt(2 * acceleration * Math.max(distance, 0)));
  const delta = acceleration * dt;
  return velocity < desired ? Math.min(desired, velocity + delta) : Math.max(desired, velocity - delta);
};

/**
 * Keeps an element scrolled to its bottom while its content grows.
 *
 * Native `scrollTo({ behavior: 'smooth' })` restarts its easing on every call, so a target that
 * moves every chunk never leaves the start of the curve — the motion reads as a stutter. This
 * carries velocity across frames instead: it accelerates as a stream begins, cruises while content
 * keeps arriving, and decelerates onto the tail when it stops.
 *
 * `@dxos/ui-editor`'s `createCrawler` follows a streaming CodeMirror document the same way, with a
 * critically-damped spring. The two are deliberately separate: that one is bound to `view.scrollDOM`
 * and driven by editor effects, where a feed owns its own scroll container. The models differ in
 * feel — a spring's speed falls off with distance, where this holds a ceiling and brakes onto the
 * target, which keeps a fast stream at a constant rate rather than an ever-widening lag.
 */
export class ScrollFollower {
  readonly #maxSpeed: number;
  readonly #acceleration: number;

  #frame: number | undefined;
  #velocity = 0;
  #timestamp = 0;

  constructor(
    private readonly _element: HTMLElement,
    { maxSpeed = DEFAULT_MAX_SPEED, acceleration = DEFAULT_ACCELERATION }: FollowOptions = {},
  ) {
    this.#maxSpeed = maxSpeed;
    this.#acceleration = acceleration;
  }

  get running(): boolean {
    return this.#frame !== undefined;
  }

  /** Starts (or continues) travelling towards the bottom. Safe to call on every content change. */
  start(): void {
    if (this.#frame !== undefined) {
      return;
    }

    this.#timestamp = performance.now();
    this.#frame = requestAnimationFrame(this.#tick);
  }

  /** Stops where it is, discarding the velocity — the reader has taken over. */
  stop(): void {
    if (this.#frame !== undefined) {
      cancelAnimationFrame(this.#frame);
      this.#frame = undefined;
    }
    this.#velocity = 0;
  }

  /** Jumps to the bottom with no animation. */
  jump(): void {
    this.stop();
    this._element.scrollTop = this._element.scrollHeight - this._element.clientHeight;
  }

  readonly #tick = (timestamp: number): void => {
    // Clamped because a backgrounded tab resumes with a large gap, which would otherwise apply one
    // enormous step and teleport the viewport.
    const dt = Math.min((timestamp - this.#timestamp) / 1_000, 0.05);
    this.#timestamp = timestamp;

    const target = this._element.scrollHeight - this._element.clientHeight;
    const distance = target - this._element.scrollTop;
    if (distance <= ARRIVED) {
      this._element.scrollTop = target;
      this.#frame = undefined;
      this.#velocity = 0;
      return;
    }

    this.#velocity = stepVelocity({
      velocity: this.#velocity,
      distance,
      dt,
      maxSpeed: this.#maxSpeed,
      acceleration: this.#acceleration,
    });

    this._element.scrollTop = Math.min(target, this._element.scrollTop + this.#velocity * dt);
    this.#frame = requestAnimationFrame(this.#tick);
  };
}
