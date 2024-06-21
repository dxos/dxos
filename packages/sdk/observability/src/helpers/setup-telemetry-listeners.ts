//
// Copyright 2022 DXOS.org
//

import type { Client } from '@dxos/client';

import { getTelemetryIdentifier } from './common';
import type { Observability } from '../observability';

let lastFocusEvent = new Date();
let totalTime = 0;

export const setupTelemetryListeners = (namespace: string, client: Client, observability: Observability) => {
  const clickCallback = (event: Event) => {
    const id = (event.target as HTMLElement)?.id;
    if (!id) {
      return;
    }

    setTimeout(() =>
      observability.event({
        identityId: getTelemetryIdentifier(client),
        name: `${namespace}.window.click`,
        properties: {
          href: window.location.href,
          id: (event.target as HTMLElement)?.id,
          path: (event.composedPath() as HTMLElement[])
            .filter((el) => Boolean(el.tagName))
            .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`)
            .reverse()
            .join('>'),
        },
      }),
    );
  };

  const focusCallback = () => {
    const now = new Date();
    setTimeout(() =>
      observability.event({
        identityId: getTelemetryIdentifier(client),
        name: `${namespace}.window.focus`,
        properties: {
          href: window.location.href,
          timeAway: now.getTime() - lastFocusEvent.getTime(),
        },
      }),
    );
    lastFocusEvent = now;
  };

  const blurCallback = () => {
    const now = new Date();
    const timeSpent = now.getTime() - lastFocusEvent.getTime();
    setTimeout(() =>
      observability.event({
        identityId: getTelemetryIdentifier(client),
        name: `${namespace}.window.blur`,
        properties: {
          href: window.location.href,
          timeSpent,
        },
      }),
    );
    lastFocusEvent = now;
    totalTime = totalTime + timeSpent;
  };

  const unloadCallback = () => {
    setTimeout(() =>
      observability.event({
        identityId: getTelemetryIdentifier(client),
        name: `${namespace}.page.unload`,
        properties: {
          href: window.location.href,
          timeSpent: totalTime,
        },
      }),
    );
  };

  const errorCallback = (event: ErrorEvent) => {
    setTimeout(() =>
      observability.event({
        identityId: getTelemetryIdentifier(client),
        name: `${namespace}.window.error`,
        properties: {
          href: window.location.href,
          message: event.message,
          filename: event.filename,
          stack: (event.error as Error).stack,
        },
      }),
    );
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
