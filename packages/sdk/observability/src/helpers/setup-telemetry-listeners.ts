//
// Copyright 2022 DXOS.org
//

import type { Client } from '@dxos/client';

import { type Observability } from '../observability';

import { getTelemetryIdentity } from './common';

let lastFocusEvent = new Date();
let totalTime = 0;

export const setupTelemetryListeners = (namespace: string, client: Client, observability: Observability) => {
  const clickCallback = (event: Event) => {
    const id = (event.target as HTMLElement)?.id;
    if (!id) {
      return;
    }

    setTimeout(() => {
      observability.track({
        ...getTelemetryIdentity(client),
        action: 'window.click',
        properties: {
          id: (event.target as HTMLElement)?.id,
          path: (event.composedPath() as HTMLElement[])
            .filter((el) => Boolean(el.tagName))
            .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`)
            .reverse()
            .join('>'),
        },
      });
    });
  };

  const focusCallback = () => {
    const now = new Date();
    setTimeout(() => {
      observability.track({
        ...getTelemetryIdentity(client),
        action: 'window.focus',
        properties: {
          timeAway: now.getTime() - lastFocusEvent.getTime(),
        },
      });
    });

    lastFocusEvent = now;
  };

  const blurCallback = () => {
    const now = new Date();
    const duration = now.getTime() - lastFocusEvent.getTime();
    setTimeout(() => {
      observability.track({
        ...getTelemetryIdentity(client),
        action: 'window.blur',
        properties: {
          duration,
        },
      });
    });

    lastFocusEvent = now;
    totalTime = totalTime + duration;
  };

  const unloadCallback = () => {
    setTimeout(() => {
      observability.track({
        ...getTelemetryIdentity(client),
        action: 'page.unload',
        properties: {
          duration: totalTime,
        },
      });
    });
  };

  const errorCallback = (event: ErrorEvent) => {
    setTimeout(() => {
      observability.track({
        ...getTelemetryIdentity(client),
        action: 'window.error',
        properties: {
          message: event.message,
          filename: event.filename,
          stack: (event.error as Error)?.stack,
          cause: (event.error as Error)?.cause,
        },
      });
    });
  };

  window.addEventListener('click', clickCallback, true);
  window.addEventListener('focus', focusCallback);
  window.addEventListener('blur', blurCallback);
  window.addEventListener('beforeunload', unloadCallback);
  window.addEventListener('error', errorCallback);

  return () => {
    window.removeEventListener('click', clickCallback, true);
    window.removeEventListener('focus', focusCallback);
    window.removeEventListener('blur', blurCallback);
    window.removeEventListener('beforeunload', unloadCallback);
    window.removeEventListener('error', errorCallback);
  };
};
