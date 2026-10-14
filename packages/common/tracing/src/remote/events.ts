//
// Copyright 2026 DXOS.org
//

type AttributeValue = number | string | boolean | null | undefined;

export type EventAttributes = Record<string, AttributeValue>;

export interface EventsProcessor {
  emit(name: string, attributes: EventAttributes): void;
}

const rethrowAsync = (err: unknown): void => {
  queueMicrotask(() => {
    throw err;
  });
};

/**
 * Lets SDK code report discrete product events without depending on any analytics backend.
 * Unlike metrics, an event is not replayed to a processor registered later: each one describes a single
 * moment, and reporting it after the fact would misdate it.
 */
export class RemoteEvents implements EventsProcessor {
  #processors = new Set<EventsProcessor>();
  readonly #onError: (err: unknown) => void;

  /**
   * @param onError receives a processor's failure; by default it is rethrown on a microtask, so it surfaces
   *   as an unhandled error without failing the emitter.
   */
  constructor({ onError = rethrowAsync }: { onError?: (err: unknown) => void } = {}) {
    this.#onError = onError;
  }

  registerProcessor(processor: EventsProcessor): void {
    this.#processors.add(processor);
  }

  unregisterProcessor(processor: EventsProcessor): void {
    this.#processors.delete(processor);
  }

  emit(name: string, attributes: EventAttributes): void {
    for (const processor of this.#processors) {
      try {
        processor.emit(name, attributes);
      } catch (err) {
        // Emitters report from inside writes like `db.add`; a failing processor must not fail the write.
        this.#onError(err);
      }
    }
  }
}
