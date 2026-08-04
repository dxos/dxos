//
// Copyright 2026 DXOS.org
//

import type { Capability, Plugin } from '@dxos/app-framework';
import type { ClientService, ConfigService } from '@dxos/client';
import type { Operation } from '@dxos/compute';

/**
 * The services a host owes the commands it collects from plugins.
 *
 * A host gathers commands through `Capabilities.Command`, whose requirement channel is erased, so
 * the compiler cannot tell it which services those commands expect. Typing the host's layer with
 * this union restores that: a missing service is a build error naming it, rather than a
 * "Service not found" the first time someone runs the command that needed it.
 *
 * Excluded are the two things a host cannot supply this way: `CommandConfig`, which carries the
 * host's global flags and is provided by its root command, and the platform environment
 * (`FileSystem`, `Path`, `Terminal`) that `@effect/cli` requires of the runtime itself.
 */
export type CommandServices = ClientService | ConfigService | Operation.Service | Plugin.Service | Capability.Service;
