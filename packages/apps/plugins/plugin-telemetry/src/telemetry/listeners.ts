//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Client } from '@dxos/react-client';
import type * as Telemetry from '@dxos/telemetry';

import { BASE_TELEMETRY_PROPERTIES, getTelemetryIdentifier } from './telemetry';

let lastFocusEvent = new Date();
let totalTime = 0;

const trigger = new Trigger<typeof Telemetry>();
void import('@dxos/telemetry').then((module) => trigger.wake(module));
export const withTelemetry = (fn: (telemetry: typeof Telemetry) => void) => trigger.wait().then(fn);

export const setupTelemetryListeners = (namespace: string, client: Client) => {
  const clickCallback = (event: any) => {
    if (BASE_TELEMETRY_PROPERTIES.group === 'dxos' && event.target && !event.target.id) {
      // TODO(wittjosiah): Use @dxos/log so these can be filtered.
      console.warn('Click event on element without id:', event.target);
    }

    setTimeout(() =>
      withTelemetry((Telemetry) =>
        Telemetry.event({
          identityId: getTelemetryIdentifier(client),
          name: `${namespace}.window.click`,
          properties: {
            ...BASE_TELEMETRY_PROPERTIES,
            href: window.location.href,
            id: (event.target as HTMLElement)?.id,
            path: (event.path as HTMLElement[])
              ?.filter((el) => Boolean(el.tagName))
              .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`)
              .reverse()
              .join('>'),
          },
        }),
      ),
    );
  };

  const focusCallback = () => {
    const now = new Date();
    setTimeout(() =>
      withTelemetry((Telemetry) =>
        Telemetry.event({
          identityId: getTelemetryIdentifier(client),
          name: `${namespace}.window.focus`,
          properties: {
            ...BASE_TELEMETRY_PROPERTIES,
            href: window.location.href,
            timeAway: now.getTime() - lastFocusEvent.getTime(),
          },
        }),
      ),
    );
    lastFocusEvent = now;
  };

  const blurCallback = () => {
    const now = new Date();
    const timeSpent = now.getTime() - lastFocusEvent.getTime();
    setTimeout(() =>
      withTelemetry((Telemetry) =>
        Telemetry.event({
          identityId: getTelemetryIdentifier(client),
          name: `${namespace}.window.blur`,
          properties: {
            ...BASE_TELEMETRY_PROPERTIES,
            href: window.location.href,
            timeSpent,
          },
        }),
      ),
    );
    lastFocusEvent = now;
    totalTime = totalTime + timeSpent;
  };

  const unloadCallback = () => {
    setTimeout(() =>
      withTelemetry((Telemetry) =>
        Telemetry.event({
          identityId: getTelemetryIdentifier(client),
          name: `${namespace}.page.unload`,
          properties: {
            ...BASE_TELEMETRY_PROPERTIES,
            href: window.location.href,
            timeSpent: totalTime,
          },
        }),
      ),
    );
  };

  const errorCallback = (event: ErrorEvent) => {
    setTimeout(() =>
      withTelemetry((Telemetry) =>
        Telemetry.event({
          identityId: getTelemetryIdentifier(client),
          name: `${namespace}.window.error`,
          properties: {
            ...BASE_TELEMETRY_PROPERTIES,
            href: window.location.href,
            message: event.message,
            filename: event.filename,
            stack: (event.error as Error).stack,
          },
        }),
      ),
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
