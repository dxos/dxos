//
// Copyright 2024 DXOS.org
//

const DefaultBatchSizeLimit = 64;

type Task<Value = unknown> = () => Promise<Value>;

export class FIFOScheduler {
  #schedulerChain: Promise<void>;

  constructor() {
    this.#schedulerChain = Promise.resolve();
  }

  schedule<T>(task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.#schedulerChain = this.#schedulerChain.then(async () => {
        try {
          resolve(await task());
        } catch (error: any) {
          reject(error);
        }
      });
    });
  }
}

// TODO(mykola): Reconcile with @dxos/async task scheduling.
export class BulkRequestDispatcher<RequestEntryProps, BulkResponse> {
  #currentBatch: RequestEntryProps[];
  #currentBulkResponse: Promise<BulkResponse> | null;
  #batchSizeLimit: number;

  constructor(batchSizeLimit: number = DefaultBatchSizeLimit) {
    this.#currentBatch = [];
    this.#currentBulkResponse = null;
    this.#batchSizeLimit = batchSizeLimit;
  }

  /**
   * Returns a bulk response promise.
   * At the event loop iteration end, the accumulated entries will be dispatched as a bulk request.
   */
  doBulkRequest(
    params: RequestEntryProps,
    bulkRequestFunc: (bulkCopy: RequestEntryProps[]) => Promise<BulkResponse>,
  ): Promise<BulkResponse> {
    if (this.#currentBatch.length >= this.#batchSizeLimit) {
      // If it reaches the batch size limit, we make another bulk request.
      this.#currentBatch = [];
      this.#currentBulkResponse = null;
    }
    this.#currentBatch.push(params);
    if (this.#currentBulkResponse != null) {
      return this.#currentBulkResponse;
    }

    // Save the current batch list reference in the function scope because this.#currentBatch could be reset
    // if the batch limit is reached.
    const batch = this.#currentBatch;
    this.#currentBulkResponse = new Promise((resolve, reject) => {
      //   script
      //     |
      //     V
      // microtasks (Promise)
      //     |
      //     V
      // macrotasks (setTimeout)
      //
      // macrotasks are run in the event loop iteration end, so we use that moment to make the bulkRequestFunc call.
      setTimeout(() => {
        // When the bulk request happens, the batch list and the response is reset to start another batch.
        // Coming callers will wait for a new response promise.
        this.#currentBulkResponse = null;

        // We cut here to make the bulk request.
        const batchCopy = batch.splice(0, batch.length);
        bulkRequestFunc(batchCopy)
          .then((result) => {
            resolve(result);
          })
          .catch((err) => {
            reject(err);
          });
      }, 0);
    });

    // This bulk response needs to be processed to extract the the result for the entry.
    return this.#currentBulkResponse;
  }
}
