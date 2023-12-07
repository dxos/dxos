//
// Copyright 2023 DXOS.org
//

import { google } from 'googleapis';
import path from 'node:path';
import process from 'node:process';

import { subscriptionHandler } from '@dxos/functions';

import { getYaml } from '../../util';

// TODO(burdon): Evolve syncer.
export const handler = subscriptionHandler(async ({ event, context, response }) => {
  // const { space, objects } = event;
  // const { client } = context;
  // TODO(burdon): Generalize util for getting properties from config/env.
  // const config = client.config;

  // Retrieve access token from OAuth Playground.
  // https://developers.google.com/oauthplayground/?code=4/0AfJohXlNEFNY3WglOvvfLXDlbvkQaf9ErIhE_8tVu2Zg_LP23UipYLULtqFIYfX9PVScnQ&scope=https://www.googleapis.com/auth/calendar.events.readonly
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
    // timeMin: (new Date()).toISOString(),
    maxResults: 10,
    // singleEvents: true,
    // orderBy: 'startTime',
  });

  console.log(events.data);
});
