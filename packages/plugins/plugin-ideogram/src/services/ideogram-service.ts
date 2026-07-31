//
// Copyright 2026 DXOS.org
//

import { type GenerationService } from '@dxos/plugin-studio/types';

import { IDEOGRAM_CONNECTOR_ID, IDEOGRAM_ID, IDEOGRAM_SOURCE } from '../constants';
import { generateWithIdeogram } from './ideogram-client';
import { IdeogramRequestConfig } from './ideogram-request';

/** The Ideogram `kind: 'image'` {@link GenerationService.GenerationService} (synchronous provider). */
export const makeIdeogramGenerationService = (): GenerationService.GenerationService => ({
  kind: 'image',
  id: IDEOGRAM_ID,
  label: 'Ideogram',
  contentType: 'image/png',
  source: IDEOGRAM_SOURCE,
  connectorId: IDEOGRAM_CONNECTOR_ID,
  requestSchema: IdeogramRequestConfig,
  defaultRequest: { model: 'V_2' },
  generate: (request, { apiKey }) => generateWithIdeogram(request, apiKey),
});
