//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import * as Telemetry from '@dxos/telemetry';

import { BASE_PROPERTIES, DX_GROUP, getIdentifier } from './base-properties';

let lastFocusEvent = new Date();
let totalTime = 0;

export const setupTelemetryListeners = (namespace: string, client: Client) => {
  const clickCallback = (event: any) => {
    if (DX_GROUP === 'dxos' && event.target && !event.target.id) {
      // TODO(wittjosiah): Use @dxos/log so these can be filtered.
      console.warn('Click event on element without id:', event.target);
    }

    Telemetry.event({
      identityId: getIdentifier(client),
      name: `${namespace}.window.click`,
      properties: {
        ...BASE_PROPERTIES,
        href: window.location.href,
        id: (event.target as HTMLElement)?.id,
        path: (event.path as HTMLElement[])
          ?.filter((el) => Boolean(el.tagName))
          .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`)
          .reverse()
          .join('>')
      }
    });
  };

  const focusCallback = () => {
    const now = new Date();
    Telemetry.event({
      identityId: getIdentifier(client),
      name: `${namespace}.window.focus`,
      properties: {
        ...BASE_PROPERTIES,
        href: window.location.href,
        timeAway: now.getTime() - lastFocusEvent.getTime()
      }
    });
    lastFocusEvent = now;
  };

  const blurCallback = () => {
    const now = new Date();
    const timeSpent = now.getTime() - lastFocusEvent.getTime();
    Telemetry.event({
      identityId: getIdentifier(client),
      name: `${namespace}.window.blur`,
      properties: {
        ...BASE_PROPERTIES,
        href: window.location.href,
        timeSpent
      }
    });
    lastFocusEvent = now;
    totalTime = totalTime + timeSpent;
  };

  const unloadCallback = () => {
    Telemetry.event({
      identityId: getIdentifier(client),
      name: `${namespace}.page.unload`,
      properties: {
        ...BASE_PROPERTIES,
        href: window.location.href,
        timeSpent: totalTime
      }
    });
  };

  window.addEventListener('click', clickCallback, true);
  window.addEventListener('focus', focusCallback);
  window.addEventListener('blur', blurCallback);
  window.addEventListener('beforeunload', unloadCallback);

  return () => {
    window.removeEventListener('click', clickCallback);
    window.removeEventListener('focus', focusCallback);
    window.removeEventListener('blur', blurCallback);
    window.removeEventListener('beforeunload', unloadCallback);
  };
};
