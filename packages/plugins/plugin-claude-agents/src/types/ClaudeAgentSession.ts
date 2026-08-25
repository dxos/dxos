//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as ClaudeManagedAgent from './ClaudeManagedAgent';

/**
 * A run of a {@link ClaudeManagedAgent.ClaudeManagedAgent}: one Anthropic-hosted session and its
 * container. Records the server's session id so the transcript can be read back later; the events
 * themselves stay on Anthropic's side and are fetched on demand rather than mirrored into the space.
 */
export class ClaudeAgentSession extends Type.makeObject<ClaudeAgentSession>(
  DXN.make('org.dxos.type.claudeAgentSession', '0.1.0'),
)(
  Schema.Struct({
    title: Schema.String.pipe(Schema.annotate({ title: 'Title' })),
    agent: Ref.Ref(ClaudeManagedAgent.ClaudeManagedAgent).pipe(
      Schema.annotate({ description: 'The agent this session runs.' }),
      FormInputAnnotation.set(false),
    ),
    /** Server-assigned `sess_…` id. */
    sessionId: Schema.String.annotate({ title: 'Session id' }),
    environmentId: Schema.String.annotate({ title: 'Environment id' }),
    /**
     * Last observed session status, as reported by the API (`running`, `idle`, `terminated`, …).
     * Held as a plain string so a status added server-side does not fail decoding.
     */
    status: Schema.optional(Schema.String.annotate({ title: 'Status' })),
    /** Why the agent last stopped, when it went idle (e.g. `end_turn`, `requires_action`). */
    stopReason: Schema.optional(Schema.String.annotate({ title: 'Stop reason' })),
  }).pipe(
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--terminal-window--regular', hue: 'indigo' }),
  ),
) {}

/** Creates a ClaudeAgentSession object. */
export const make = (props: Obj.MakeProps<typeof ClaudeAgentSession>): ClaudeAgentSession =>
  Obj.make(ClaudeAgentSession, props);
