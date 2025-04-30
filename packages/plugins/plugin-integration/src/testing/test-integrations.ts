//
// Copyright 2025 DXOS.org
//

import { createStatic } from '@dxos/echo-schema';
import { OAuthProvider } from '@dxos/protocols';

import { type BaseIntegrationRegistry, type IntegrationQuery, IntegrationDefinition } from '../types';

// TODO(wittjosiah): Based on services from plugin-assistant. Reconcile.

export class MockIntegrationRegistry implements BaseIntegrationRegistry {
  async queryIntegrations(query?: IntegrationQuery): Promise<IntegrationDefinition[]> {
    return TEST_INTEGRATIONS;
  }
}

export const TEST_INTEGRATIONS: IntegrationDefinition[] = [
  createStatic(IntegrationDefinition, {
    serviceId: 'google.com/service/mail',
    name: 'Gmail',
    description: 'Connect to your Gmail account.',
    icon: 'ph--envelope--regular',
    auth: {
      kind: 'oauth',
      source: 'mail.google.com',
      note: 'Email read access.',
      provider: OAuthProvider.GOOGLE,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    },
  }),

  createStatic(IntegrationDefinition, {
    serviceId: 'google.com/service/calendar',
    name: 'Google Calendar',
    description: 'Connect to your Google Calendar.',
    icon: 'ph--calendar--regular',
    auth: {
      kind: 'oauth',
      source: 'calendar.google.com',
      note: 'Calendar read access.',
      provider: OAuthProvider.GOOGLE,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    },
  }),

  createStatic(IntegrationDefinition, {
    serviceId: 'discord.com/service/guild',
    name: 'Discord',
    description: 'Connect to your Discord server.',
    icon: 'ph--discord-logo--regular',
    auth: {
      kind: 'token',
      source: 'discord.com',
      note: 'Discord bot token.',
    },
  }),

  createStatic(IntegrationDefinition, {
    serviceId: 'github.com/service/account',
    name: 'GitHub',
    description: 'Connect to your GitHub account.',
    icon: 'ph--github-logo--regular',
    auth: {
      kind: 'token',
      source: 'github.com',
      note: 'GitHub personal access token.',
    },
  }),

  createStatic(IntegrationDefinition, {
    serviceId: 'amadeus.com/service/FlightSearch',
    name: 'Amadeus Flights',
    description: 'Search for local and international flights via Amadeus.',
    icon: 'ph--airplane-takeoff--regular',
  }),

  createStatic(IntegrationDefinition, {
    serviceId: 'amadeus.com/service/HotelSearch',
    name: 'Amadeus Hotels',
    description: 'Search for local and international hotels via Amadeus.',
    icon: 'ph--bed--regular',
  }),

  createStatic(IntegrationDefinition, {
    serviceId: 'bsky.app/service/account',
    name: 'Bluesky',
    description: 'Connect to your Bluesky account.',
    icon: 'ph--butterfly--regular',
  }),

  createStatic(IntegrationDefinition, {
    serviceId: 'visualcrossing.com/service/Weather',
    name: 'Weather',
    description: 'Search for global weather forecasts via Visual Crossing.',
    icon: 'ph--cloud-sun--regular',
  }),

  createStatic(IntegrationDefinition, {
    serviceId: 'abstractapi.com/service/GeoLocation',
    name: 'GeoLocation',
    description: 'Get the location of any IP address via AbstractAPI.',
    icon: 'ph--map-pin--regular',
  }),
] as const;
