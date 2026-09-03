//
// Copyright 2026 DXOS.org
//

import { type KeyDownEvent, type KeyUpEvent, SingletonAction, type WillAppearEvent } from '@elgato/streamdeck';

import type * as Protocol from '@dxos/plugin-stream-deck/Protocol';

import { toImageUri } from '../image.ts';
import { offlineKey } from '../offline.ts';
import { assignSlots, slotOf } from '../server/slots.ts';

export const FAVORITE_ACTION_UUID = 'org.dxos.composer.favorite';

export type FavoriteHost = {
  /** Reports a key interaction to Composer. */
  input: (input: Omit<Protocol.Input, '_tag'>) => void;
  /** Whether Composer is currently connected; drives the offline state on appear. */
  connected: () => boolean;
};

/**
 * One key showing one of the space's favorites. The user places as many instances as they want
 * keys; slots are assigned by position, so this action holds no configuration of its own.
 */
export class FavoriteAction extends SingletonAction {
  // Elgato documents an `@action({ UUID })` decorator, but it only assigns this field, and Node has
  // no native decorator support — the bundler emitted a decorated class *expression*, which is
  // invalid JS. Assigning the field directly is equivalent and needs no lowering.
  override readonly manifestId = FAVORITE_ACTION_UUID;

  #host?: FavoriteHost;

  bind(host: FavoriteHost): void {
    this.#host = host;
  }

  /** Applies the key images from a frame, in slot order; extra slots are left offline. */
  async apply(keys: readonly (Protocol.KeyImage | null)[]): Promise<void> {
    const instances = assignSlots([...this.actions]);
    await Promise.all(
      instances.map((instance, slot) => instance.setImage(toImageUri(keys[slot]?.svg ?? offlineKey()))),
    );
  }

  async clear(): Promise<void> {
    await Promise.all(assignSlots([...this.actions]).map((instance) => instance.setImage(toImageUri(offlineKey()))));
  }

  // A key that appears while Composer is absent would otherwise show the manifest icon and look
  // functional; paint the offline state until the first frame arrives.
  override async onWillAppear(_ev: WillAppearEvent): Promise<void> {
    if (!this.#host?.connected()) {
      await this.clear();
    }
  }

  override onKeyDown(ev: KeyDownEvent): void {
    this.#report('keyDown', ev);
  }

  override onKeyUp(ev: KeyUpEvent): void {
    this.#report('keyUp', ev);
  }

  #report(kind: Protocol.InputKind, ev: KeyDownEvent | KeyUpEvent): void {
    const slot = slotOf([...this.actions], ev.action as never);
    if (slot < 0) {
      return;
    }
    this.#host?.input({ kind, slot });
  }
}
