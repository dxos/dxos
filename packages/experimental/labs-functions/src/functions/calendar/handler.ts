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

const { authenticate } = require('@google-cloud/local-auth');

// TODO(burdon): Evolve syncer.
export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const { space, objects } = event;
  if (!space) {
    return;
  }

  // TODO(burdon): Prevent multiple calls from scheduler.

  // const { client } = context;
  // TODO(burdon): Generalize util for getting properties from config/env.
  // const config = client.config;

  // TODO(burdon): Grab refresh token before expires.
  // Retrieve access token from OAuth Playground (expires in 1hr).
  // https://developers.google.com/oauthplayground/#step2&apisSelect=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events.readonly&url=https%3A%2F%2F&content_type=application%2Fjson&http_method=GET&useDefaultOauthCred=unchecked&oauthEndpointSelect=Google&oauthAuthEndpointValue=https%3A%2F%2Faccounts.google.com%2Fo%2Foauth2%2Fv2%2Fauth&oauthTokenEndpointValue=https%3A%2F%2Foauth2.googleapis.com%2Ftoken&includeCredentials=unchecked&accessTokenType=bearer&autoRefreshToken=unchecked&accessType=offline&prompt=consent&response_type=code&wrapLines=on
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

  let events;
  try {
    events = await calendar.events.list({
      auth: oauth2Client,
      calendarId: 'primary',
      maxResults: 10,
      // timeMin: new Date().toISOString(),
      // singleEvents: true,
      // orderBy: 'startTime',
    });
  } catch (err: any) {
    // TODO(burdon): Could not determine client ID from request. For use with playground only?
    console.log(err);
  }

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
