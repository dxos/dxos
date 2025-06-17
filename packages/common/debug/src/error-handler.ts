//
// Copyright 2020 DXOS.org
//

import { EventEmitter } from 'node:events';

/**
 * Listens for global errors.
 */
export class ErrorHandler extends EventEmitter {
  _listener: EventListener;

  constructor() {
    super();

    this._listener = (event: any) => {
      const cause = event.error || event.reason || event;
      const message = cause.stack || cause.message || cause.toString();
      this.emit('error', message);

      // Default logging.
      // code event.preventDefault();
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event
    window.addEventListener('error', this._listener);

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
    window.addEventListener('unhandledrejection', this._listener);
  }

  reset(): void {
    window.removeEventListener('error', this._listener);
    window.removeEventListener('unhandledrejection', this._listener);
  }
}
