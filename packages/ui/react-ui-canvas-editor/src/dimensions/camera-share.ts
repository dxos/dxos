//
// Copyright 2026 DXOS.org
//

import { type Camera } from '@dxos/react-ui-canvas';

/** Least time between two shares of the view while it moves; a follower glides over about the same time. */
export const SHARE_INTERVAL_MS = 100;
export const FOLLOW_GLIDE_MS = 120;

// A camera converted to the shared form and back differs in the last places.
const nearCamera = (left: Camera, right: Camera) =>
  Math.abs(left.x - right.x) < 1e-3 && Math.abs(left.y - right.y) < 1e-3 && Math.abs(left.zoom - right.zoom) < 1e-6;

/**
 * Shares a view's camera as it moves, at most every `SHARE_INTERVAL_MS`, and always its last one. The peer camera the
 * view glides to, and the cameras it passes through on the way, are never shared back.
 */
export class CameraShare {
  readonly #share: (camera: Camera) => void;
  // The last shared camera either way: this view's own, or the peer's it glided to.
  #last: Camera | undefined = undefined;
  #latest: Camera | undefined = undefined;
  #sharedAt = -Infinity;
  #glidingUntil = -Infinity;
  // Whether the last shared camera is a peer's this view follows, not one of its own.
  #following = false;
  #pending: ReturnType<typeof setTimeout> | undefined = undefined;

  constructor(share: (camera: Camera) => void) {
    this.#share = share;
  }

  /** The view now shows `camera`, in the shared form. */
  moved(camera: Camera): void {
    this.#latest = camera;
    clearTimeout(this.#pending);
    this.#report();
  }

  /** A peer's camera to glide to; false when the view already shows it. */
  follow(camera: Camera): boolean {
    if (this.#last && nearCamera(this.#last, camera)) {
      return false;
    }
    this.#last = camera;
    this.#following = true;
    this.#glide();
    return true;
  }

  /**
   * The followed peer's camera, to show again once the view resized: the resize moved this view's centre, not theirs.
   * Undefined when the view last showed a camera of its own.
   */
  refollow(): Camera | undefined {
    if (!this.#following || !this.#last) {
      return undefined;
    }
    this.#glide();
    return this.#last;
  }

  dispose(): void {
    clearTimeout(this.#pending);
  }

  #glide(): void {
    clearTimeout(this.#pending);
    this.#glidingUntil = Date.now() + FOLLOW_GLIDE_MS * 2;
  }

  #report(): void {
    const next = this.#latest;
    const now = Date.now();
    if (!next) {
      return;
    }
    // What the view shows once the glide is over is shared, should it have moved on its own meanwhile.
    if (now < this.#glidingUntil) {
      this.#pending = setTimeout(() => this.#report(), this.#glidingUntil - now);
      return;
    }
    if (this.#last && nearCamera(this.#last, next)) {
      return;
    }
    const wait = this.#sharedAt + SHARE_INTERVAL_MS - now;
    if (wait > 0) {
      this.#pending = setTimeout(() => this.#report(), wait);
      return;
    }
    this.#last = next;
    this.#following = false;
    this.#sharedAt = now;
    this.#share(next);
  }
}
