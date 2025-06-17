//
// Copyright 2025 DXOS.org
//

/**
 * Array that holds the last N items.
 */
export class HistoryCache<T> {
  private readonly _limit: number;
  private readonly _messages: T[];

  constructor(limit = 100) {
    this._limit = limit;
    this._messages = [];
  }

  push(...messages: T[]): void {
    if (this._messages.length >= this._limit) {
      this._messages.shift(); // Remove the oldest message
    }
    this._messages.push(...messages); // Add new message
  }

  get(): T[] {
    return this._messages;
  }
}
