//
// Copyright 2023 DXOS.org
//

import { google } from 'googleapis';
import path from 'node:path';
import process from 'node:process';

import { Event as EventType } from '@braneframe/types';
import { subscriptionHandler } from '@dxos/functions';

import { ObjectSyncer } from '../../sync';
import { getYaml } from '../../util';

export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const { space } = event;
  if (!space) {
    return;
  }

  // TODO(burdon): Prevent multiple calls from scheduler.

  // Run `npm run auth` to create credentials file for testing.
  const { access_token: accessToken, refresh_token: refreshToken } =
    getYaml<{
      access_token: string;
      refresh_token: string;
    }>(path.join(process.env.HOME!, '.config/dx/credentials', 'google.json')) ?? {};
  if (!accessToken || !refreshToken) {
    return response.status(401);
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    scope: 'https://www.googleapis.com/auth/calendar',
    token_type: 'Bearer',
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const events = await calendar.events.list({
    auth: oauth2Client,
    calendarId: 'primary',
    maxResults: 10,
    // timeMin: new Date().toISOString(),
    // singleEvents: true,
    // orderBy: 'startTime',
  });

  const sourceId = 'google.com/calendar';
  const syncer = new ObjectSyncer<EventType>(EventType.filter(), (object) => {
    for (const { id, source } of object.__meta?.keys ?? []) {
      if (source === sourceId) {
        return id;
      }
    }

    return undefined;
  });

  await syncer.open(space);

  // Etag represents specific version of a resource (like content addressing for caching).
  // NOTE: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag
  const { kind, etag, summary, updated, nextPageToken } = events.data;
  console.log({ kind, etag, summary, updated, nextPageToken });
  for (const event of events.data.items ?? []) {
    const { kind, id, created, updated, summary, creator, start, end, recurrence, attendees } = event;
    if (id) {
      const existing = syncer.getObject(id);
      // TODO(burdon): Upsert.
      if (!existing) {
        space.db.add(
          new EventType(
            {
              title: summary || '',
            },
            { meta: { keys: [{ source: sourceId, id }] } },
          ),
        );
      }
    }
  }

  await syncer.close();
});
