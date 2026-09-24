//
// Copyright 2026 DXOS.org
//

import {
  type DialDownEvent,
  type DialRotateEvent,
  type DialUpEvent,
  SingletonAction,
  type TouchTapEvent,
  type WillAppearEvent,
} from '@elgato/streamdeck';

import type * as Protocol from '@dxos/plugin-stream-deck/Protocol';

import { offlineDial } from '../offline.ts';
import { assignSlots, slotOf } from '../server/slots.ts';

export const MONITOR_ACTION_UUID = 'org.dxos.composer.monitor';

/** Elgato's title/icon/value/indicator layout — the only predefined one with a progress bar. */
const LAYOUT = '$B1';

export type MonitorHost = {
  input: (input: Omit<Protocol.Input, '_tag'>) => void;
  connected: () => boolean;
};

const toFeedback = (segment: Protocol.DialFeedback) => ({
  title: segment.title,
  value: segment.value,
  // `$B1`'s indicator is a percentage; a segment with no bar shows an empty one.
  indicator: { value: Math.round((segment.bar ?? 0) * 100) },
});

/**
 * One touch-strip segment above a dial, showing a running task or a space statistic. Rotation and
 * press are reported to Composer but currently unbound there.
 */
export class MonitorAction extends SingletonAction {
  // See the note in `FavoriteAction`: the documented decorator only assigns this field, and Node
  // cannot execute decorators.
  override readonly manifestId = MONITOR_ACTION_UUID;

  #host?: MonitorHost;

  bind(host: MonitorHost): void {
    this.#host = host;
  }

  async apply(dials: readonly (Protocol.DialFeedback | null)[]): Promise<void> {
    const instances = assignSlots([...this.actions]);
    await Promise.all(
      instances.map((instance, slot) => {
        const segment = dials[slot];
        return 'setFeedback' in instance
          ? instance.setFeedback(toFeedback(segment ?? { title: '', value: '' }))
          : Promise.resolve();
      }),
    );
  }

  async clear(): Promise<void> {
    await this.apply([]);
    await Promise.all(
      assignSlots([...this.actions]).map((instance) =>
        'setFeedback' in instance ? instance.setFeedback(toFeedback(offlineDial)) : Promise.resolve(),
      ),
    );
  }

  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    // The layout is set here rather than in the manifest so a segment placed while the plugin is
    // already running still gets the bar layout.
    if ('setFeedbackLayout' in ev.action) {
      await ev.action.setFeedbackLayout(LAYOUT);
    }
    if (!this.#host?.connected()) {
      await this.clear();
    }
  }

  override onDialDown(ev: DialDownEvent): void {
    this.#report('dialDown', ev.action);
  }

  override onDialUp(ev: DialUpEvent): void {
    this.#report('dialUp', ev.action);
  }

  override onDialRotate(ev: DialRotateEvent): void {
    this.#report('dialRotate', ev.action, ev.payload.ticks);
  }

  override onTouchTap(ev: TouchTapEvent): void {
    this.#report('touchTap', ev.action);
  }

  #report(kind: Protocol.InputKind, source: unknown, ticks?: number): void {
    const slot = slotOf([...this.actions], source as never);
    if (slot < 0) {
      return;
    }
    this.#host?.input({ kind, slot, ...(ticks === undefined ? {} : { ticks }) });
  }
}
