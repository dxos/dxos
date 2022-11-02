//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useAsyncEffect } from '@dxos/react-async';
import * as Sentry from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';

import { DX_ENVIRONMENT, DX_RELEASE, BASE_PROPERTIES } from '../telemetry';

const SENTRY_DESTINATION = process.env.SENTRY_DSN;
const TELEMETRY_API_KEY = process.env.SEGMENT_API_KEY;

export const useTelemetry = () => {
  // const client = useClient();
  // TODO(wittjosiah): Store uuid in halo for the purposes of usage metrics.
  // await client.halo.getGlobalPreference('dxosTelemetryIdentifier');
  const identityId = undefined;

  const location = useLocation();
  const [lastFocusEvent, setLastFocusEvent] = useState(new Date());
  const [totalTime, setTotalTime] = useState(0);

  // TODO(wittjosiah): Store preference for disabling telemetry.
  //   At minimum should be stored locally (i.e., localstorage), possibly in halo preference.
  //   Needs to be hooked up to settings page for user visibility.

  useEffect(() => {
    if (SENTRY_DESTINATION) {
      Sentry.init({
        destination: SENTRY_DESTINATION,
        environment: DX_ENVIRONMENT,
        release: DX_RELEASE,
        // TODO(wittjosiah): Configure this.
        sampleRate: 1.0
      });
    }

    Telemetry.init({
      apiKey: TELEMETRY_API_KEY,
      enable: Boolean(TELEMETRY_API_KEY)
    });

    Telemetry.event({
      identityId,
      name: 'halo-app.page.load',
      properties: {
        ...BASE_PROPERTIES,
        loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart
      }
    });

    window.addEventListener(
      'click',
      (event: any) => {
        if (BASE_PROPERTIES.group === 'dxos' && event.target && !event.target.id) {
          // TODO(wittjosiah): Use @dxos/log so these can be filtered.
          console.warn('Click event on element without id:', event.target);
        }

        Telemetry.event({
          identityId,
          name: 'halo-app.window.click',
          properties: {
            ...BASE_PROPERTIES,
            id: (event.target as HTMLElement)?.id,
            path: (event.path as HTMLElement[])
              ?.filter((el) => Boolean(el.tagName))
              .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`)
              .reverse()
              .join('>')
          }
        });
      },
      true
    );

    window.addEventListener('focus', () => {
      const now = new Date();
      Telemetry.event({
        identityId,
        name: 'halo-app.window.focus',
        properties: {
          ...BASE_PROPERTIES,
          timeAway: now.getTime() - lastFocusEvent.getTime()
        }
      });
      setLastFocusEvent(now);
    });

    window.addEventListener('blur', () => {
      const now = new Date();
      const timeSpent = now.getTime() - lastFocusEvent.getTime();
      Telemetry.event({
        identityId,
        name: 'halo-app.window.blur',
        properties: {
          ...BASE_PROPERTIES,
          timeSpent
        }
      });
      setLastFocusEvent(now);
      setTotalTime((time) => time + timeSpent);
    });

    window.addEventListener('beforeunload', () => {
      Telemetry.event({
        identityId,
        name: 'halo-app.page.unload',
        properties: {
          ...BASE_PROPERTIES,
          timeSpent: totalTime
        }
      });
    });
  }, []);

  useAsyncEffect(async () => {
    Telemetry.page({
      identityId,
      properties: BASE_PROPERTIES
    });
  }, [location]);
};
