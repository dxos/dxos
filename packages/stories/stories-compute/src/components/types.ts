//
// Copyright 2026 DXOS.org
//

import type * as Process from '@dxos/compute/Process';

/** Where the user asks a process to run; the space an EDGE location needs is the story's own. */
export type LocationKind = Process.Location['kind'];

/** A process the story spawned, with the params its card sends as the first input. */
export type SpawnedProcess<Params, Input, Output> = {
  id: string;
  location: Process.Location;
  params: Params;
  handle: Process.Handle<Input, Output, never>;
};
