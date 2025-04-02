//
// Copyright 2025 DXOS.org
//

import { type GenerateRequest, type GenerationStreamEvent } from './types';

// TODO(burdon): Create wrapper for edge/ollama. Create session?
export interface AIServiceClient {
  exec(request: GenerateRequest): Promise<GenerationStream>;
}

export interface GenerationStream extends AsyncIterable<GenerationStreamEvent> {
  abort(): void;
  complete(): Promise<void>;
}
