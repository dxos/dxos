//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Operation from '@dxos/compute/Operation';
import { Ref } from '@dxos/echo';
import * as InboxResolver from '@dxos/extractor-lib';
import { syncConnectionBindings } from '@dxos/plugin-connector';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';

import { GoogleCalendarApi, GoogleCredentials } from '../../../services';
import { syncCalendar } from './sync';

const handler = InboxOperation.GoogleCalendarSync.pipe(
  Operation.withHandler(({ connection, priority, googleCalendarId, syncBackDays, syncForwardDays, pageSize }) =>
    syncConnectionBindings({
      connection,
      priority,
      sync: (binding) =>
        // Layer stack, top-down: `syncCalendar` needs GoogleCalendarApi + Resolver (a test swaps the
        // API for `GoogleCalendarApi.mock`); `GoogleCalendarApi.Live` needs the HTTP client + the
        // binding's credentials.
        syncCalendar({ binding: Ref.make(binding), googleCalendarId, syncBackDays, syncForwardDays, pageSize }).pipe(
          Effect.provide(
            Layer.mergeAll(
              GoogleCalendarApi.Live.pipe(
                Layer.provide(FetchHttpClient.layer),
                Layer.provide(GoogleCredentials.fromAccessToken(binding.spec.source)),
              ),
              InboxResolver.Live,
            ),
          ),
        ),
    }).pipe(
      Effect.map(({ outputs }) => ({
        newEvents: outputs.reduce((total, output) => total + (output?.newEvents ?? 0), 0),
      })),
    ),
  ),
  Operation.opaqueHandler,
);

export default handler;
