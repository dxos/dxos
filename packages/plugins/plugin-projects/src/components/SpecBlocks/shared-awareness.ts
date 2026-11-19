//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type AwarenessProvider, type AwarenessState } from '@dxos/ui-editor';

type Slot = {
  hasFocus: () => boolean;
  /** The peers whose carets fall in the field now, and those it last drew. */
  peers: () => string;
  drawn: string;
};

const peersOf = (states: readonly AwarenessState[]) => states.map(({ peerId }) => peerId).join(',');

export type FieldAwarenessOptions = {
  hasFocus: () => boolean;
  /** Whether a peer's caret, as a cursor on the spec's text, falls in the field. */
  contains: (cursor: string) => boolean;
};

/**
 * One presence channel shared by a spec's editor and the field editors nested in its block cards. A field editor sits
 * inside the spec editor's content, so the spec editor counts as focused while a field is and would publish its own
 * stale caret; the channel drops the spec editor's caret while a field has focus, and a field's cleared caret when the
 * focus moved to another of the editors.
 */
export class SharedAwareness {
  #provider?: AwarenessProvider;
  readonly #fields = new Set<Slot>();
  /** The spec editor, which has focus whenever one of its fields does. */
  view?: EditorView;

  /** Wraps the spec editor's provider; passed as `createDataExtensions`' `wrapAwareness`. */
  readonly wrap = (provider: AwarenessProvider): AwarenessProvider => {
    this.#provider = provider;
    return {
      remoteStateChange: provider.remoteStateChange,
      open: () => provider.open(),
      close: () => provider.close(),
      getRemoteStates: () => provider.getRemoteStates(),
      update: (position, options) => {
        if (![...this.#fields].some((field) => field.hasFocus())) {
          provider.update(position, options);
        }
      },
    };
  };

  /** A field editor's provider: the spec editor opens and closes the channel, so the field only publishes on it. */
  field({ hasFocus, contains }: FieldAwarenessOptions): AwarenessProvider | undefined {
    const provider = this.#provider;
    if (!provider) {
      return undefined;
    }
    const inField = () =>
      provider
        .getRemoteStates()
        .filter(
          ({ position }) => position?.anchor && position.head && contains(position.anchor) && contains(position.head),
        );
    const slot: Slot = { hasFocus, peers: () => peersOf(inField()), drawn: '' };
    return {
      remoteStateChange: provider.remoteStateChange,
      open: () => this.#fields.add(slot),
      close: () => this.#fields.delete(slot),
      getRemoteStates: () => {
        const states = inField();
        slot.drawn = peersOf(states);
        return states;
      },
      update: (position, options) => {
        // Focus that left the field for the spec editor or another field publishes from there.
        if (position || !this.view?.hasFocus) {
          provider.update(position, options);
        }
      },
    };
  }

  /**
   * Redraws the editors when the spec's text moved a caret into or out of a field. A caret names the character after it,
   * so text typed ahead of it changes no presence state, and a field whose own text did not change would keep it.
   */
  textChanged(): void {
    if ([...this.#fields].some((slot) => slot.peers() !== slot.drawn)) {
      this.#provider?.remoteStateChange.emit();
    }
  }
}
