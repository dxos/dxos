//
// Copyright 2025 DXOS.org
//

import { type ServiceType } from './schema';

export type ServiceQuery = {
  name?: string;
  category?: string;
};

export interface BaseServiceRegistry {
  queryServices(query?: ServiceQuery): Promise<ServiceType[]>;
}

export const categoryIcons: Record<string, string> = {
  finance: 'ph--bank--regular',
  health: 'ph--heart--regular',
  geolocation: 'ph--globe-simple--regular',
  education: 'ph--books--regular',
  entertainment: 'ph--music-notes--regular',
  shopping: 'ph--shopping-cart--regular',
  travel: 'ph--airplane-takeoff--regular',
  utilities: 'ph--lightning--regular',
  weather: 'ph--cloud-rain--regular',
} as const;
