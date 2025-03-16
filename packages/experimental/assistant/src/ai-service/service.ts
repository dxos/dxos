//
// Copyright 2025 DXOS.org
//

import { type GenerateRequest, type GenerationStreamEvent } from './types';

<<<<<<< HEAD
=======
// TODO(burdon): Create wrapper for edge/ollama. Create session?
>>>>>>> origin/main
export interface AIServiceClient {
  exec(request: GenerateRequest): Promise<GenerationStream>;
}

export interface GenerationStream extends AsyncIterable<GenerationStreamEvent> {
  abort(): void;
  complete(): Promise<void>;
}
