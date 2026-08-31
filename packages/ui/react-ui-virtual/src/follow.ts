//
// Copyright 2026 DXOS.org
//

/**
 * Speeds are expressed in **rows**, not pixels: a feed of tall messages and one of short replies
 * should travel at the same perceived rate, and only a row-relative unit gives that.
 */
export type FollowOptions = {
  /** Ceiling on travel speed, rows/s. */
  maxSpeed?: number;
  /** Rate the speed ramps up, rows/s². */
  acceleration?: number;
  /** Rate the speed sheds on approach, rows/s². Lower than `acceleration` gives a longer landing. */
  deceleration?: number;
  /** Height of a row in px, sampled each frame so a measured list can refine it. */
  rowHeight?: () => number;
  /** Empty space reserved below the last row, which the follow must stop short of. */
  trailing?: () => number;
};

const DEFAULT_MAX_SPEED = 2;
const DEFAULT_ACCELERATION = 12;
const DEFAULT_DECELERATION = 6;
/**
 * Gentler than the ramp up, and deliberately so.
 *
 * Braking distance is `v²/2d`, so matching the two rates sheds full speed in three rows — a travel
 * of any length then cruises to within a few rows of the target and stops, which reads as an abrupt
 * halt however correct the curve is. At a third of the acceleration the landing occupies nine rows
 * and a second and a half, which is long enough to see.
 */
const DEFAULT_ROW_HEIGHT = 120;

/** Within this distance the follow has arrived; below it the animation would only jitter. */
const ARRIVED = 0.5;

/** The physics runs in pixels; rows are converted at the boundary by {@link ScrollFollower}. */
export type VelocityStep = {
  /** Current speed, px/s. */
  velocity: number;
  /** Remaining distance to the target, px. */
  distance: number;
  /** Elapsed time since the last step, seconds. */
  dt: number;
  /** Ceiling, px/s. */
  maxSpeed: number;
  /** Ramp-up rate, px/s². */
  acceleration: number;
  /** Approach rate, px/s². Defaults to `acceleration`. */
  deceleration?: number;
};

/**
 * Speed for the next frame of a follow.
 *
 * Ramps up to `maxSpeed` and back down so the travel starts and ends gently rather than jumping.
 * The cap is whichever is lower: the ceiling, or the speed from which the remaining distance can
 * still be shed at `acceleration` (`v = sqrt(2·a·d)`) — that second term is what turns the arrival
 * into a deceleration instead of a stop, and what keeps a growing target at cruise speed.
 *
 * Acceleration is rate-limited so a start is gradual; **deceleration is not**, because the braking
 * curve is already a smooth ramp to zero and easing onto it instead leaves the speed above the
 * curve for the whole approach — the follow then runs out of distance while still moving and the
 * arrival reads as a stop rather than a landing.
 */
export const stepVelocity = ({
  velocity,
  distance,
  dt,
  maxSpeed,
  acceleration,
  deceleration = acceleration,
}: VelocityStep): number => {
  const braking = Math.sqrt(2 * deceleration * Math.max(distance, 0));
  const desired = Math.min(maxSpeed, braking);
  return velocity < desired ? Math.min(desired, velocity + acceleration * dt) : desired;
};

/**
 * **Not wired into `MessageList` at present.** The placement engine follows the tail by holding an
 * intent and correcting the offset, which arrives instantly; this class is the animated travel the
 * old engine used, kept with its tests because the glide is worth having back and nothing about it
 * was wrong. Wiring it is a decision about feel, not a repair.
 */
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
  readonly #deceleration: number;
  readonly #rowHeight: () => number;
  readonly #trailing: () => number;

  #frame: number | undefined;
  #velocity = 0;
  #timestamp = 0;
  #braking = false;

  constructor(
    private readonly _element: HTMLElement,
    {
      maxSpeed = DEFAULT_MAX_SPEED,
      acceleration = DEFAULT_ACCELERATION,
      deceleration = DEFAULT_DECELERATION,
      rowHeight = () => DEFAULT_ROW_HEIGHT,
      trailing = () => 0,
    }: FollowOptions = {},
  ) {
    this.#maxSpeed = maxSpeed;
    this.#acceleration = acceleration;
    this.#deceleration = deceleration;
    this.#rowHeight = rowHeight;
    this.#trailing = trailing;
  }

  /**
   * The bottom of the last row, which is not the bottom of the document.
   *
   * A feed may reserve empty space below its last row so that row can be brought to the top of the
   * viewport. That space is somewhere the reader may go and nowhere the follow should: chasing the
   * element's own maximum walks the feed off the end of the conversation and keeps going.
   */
  get #bottom(): number {
    return this._element.scrollHeight - this.#trailing() - this._element.clientHeight;
  }

  get running(): boolean {
    return this.#frame !== undefined;
  }

  /** Current speed, rows/s. Exposed so a harness can show the ramp. */
  get velocity(): number {
    return this.#velocity / Math.max(this.#rowHeight(), 1);
  }

  /** Starts (or continues) travelling towards the bottom. Safe to call on every content change. */
  start(): void {
    this.#braking = false;
    if (this.#frame !== undefined) {
      return;
    }

    this.#timestamp = performance.now();
    this.#frame = requestAnimationFrame(this.#tick);
  }

  /**
   * Coasts to a halt, shedding speed at `deceleration` — what a stream ending or a stop control
   * means. Cutting the animation instead would halt mid-glide, which is the one motion the reader
   * cannot have caused and so reads as a fault.
   */
  stop(): void {
    if (this.#frame === undefined) {
      this.#velocity = 0;
      return;
    }

    this.#braking = true;
  }

  /**
   * Halts immediately, discarding the velocity — the reader has taken over, or the list is going
   * away. Coasting here would fight a hand already on the scrollbar.
   */
  cancel(): void {
    if (this.#frame !== undefined) {
      cancelAnimationFrame(this.#frame);
      this.#frame = undefined;
    }
    this.#braking = false;
    this.#velocity = 0;
  }

  /** Jumps to the bottom with no animation. */
  jump(): void {
    this.cancel();
    this._element.scrollTop = Math.max(0, this.#bottom);
  }

  readonly #tick = (timestamp: number): void => {
    // Clamped because a backgrounded tab resumes with a large gap, which would otherwise apply one
    // enormous step and teleport the viewport.
    const dt = Math.min((timestamp - this.#timestamp) / 1_000, 0.05);
    this.#timestamp = timestamp;

    const target = Math.max(0, this.#bottom);
    const distance = target - this._element.scrollTop;

    // Coasting: the target no longer matters, only shedding what speed is left. Bounded by the
    // bottom so a stop late in a travel still cannot run past it.
    if (this.#braking) {
      const rowHeight = Math.max(this.#rowHeight(), 1);
      this.#velocity = Math.max(0, this.#velocity - this.#deceleration * rowHeight * dt);
      if (this.#velocity <= 0 || distance <= ARRIVED) {
        this.#frame = undefined;
        this.#velocity = 0;
        this.#braking = false;
        return;
      }

      this._element.scrollTop = Math.min(target, this._element.scrollTop + this.#velocity * dt);
      this.#frame = requestAnimationFrame(this.#tick);
      return;
    }

    if (distance <= ARRIVED) {
      this._element.scrollTop = target;
      this.#frame = undefined;
      this.#velocity = 0;
      return;
    }

    // Rows are converted to pixels every frame rather than once, so a list whose measured rows grow
    // (a streaming message) travels at the same rate in rows throughout.
    const rowHeight = Math.max(this.#rowHeight(), 1);
    this.#velocity = stepVelocity({
      velocity: this.#velocity,
      distance,
      dt,
      maxSpeed: this.#maxSpeed * rowHeight,
      acceleration: this.#acceleration * rowHeight,
      deceleration: this.#deceleration * rowHeight,
    });

    this._element.scrollTop = Math.min(target, this._element.scrollTop + this.#velocity * dt);
    this.#frame = requestAnimationFrame(this.#tick);
  };
}
