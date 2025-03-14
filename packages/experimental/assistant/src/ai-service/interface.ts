//
// Copyright 2025 DXOS.org
//

import { type GenerateRequest, type GenerationStreamEvent } from './types';

export interface AIService {
  exec(request: GenerateRequest): Promise<GenerationStream>;
}

export interface GenerationStream extends AsyncIterable<GenerationStreamEvent> {
  abort(): void;
  complete(): Promise<void>;
}
