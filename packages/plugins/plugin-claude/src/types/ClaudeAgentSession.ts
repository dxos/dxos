//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { AccessToken } from '@dxos/link';

import { ANTHROPIC_SOURCE } from '../constants';
import * as ClaudeManagedAgent from './ClaudeManagedAgent';

/**
 * A credential bound to a session, by reference rather than by value: the secret is resolved from
 * the space when it is injected and delivered to the container's environment over the control plane,
 * so it never appears in a message, a transcript or an operation result.
 */
/**
 * Names that change how the container itself runs rather than naming a secret the agent reads —
 * a proxy, the loader, the module path. Rejected because a credential binding is the one place a
 * caller can set an environment variable in a live session, and these would redirect its traffic
 * or its code rather than authorise a request.
 */
const RESERVED_CREDENTIAL_NAMES = [
  'PATH',
  'HOME',
  'SHELL',
  'NODE_OPTIONS',
  'NODE_EXTRA_CA_CERTS',
  'LD_PRELOAD',
  'LD_LIBRARY_PATH',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'NO_PROXY',
] as const;

/**
 * Upper-case only, so the lower-case spelling of a reserved name (`http_proxy`, honoured by most
 * clients) cannot slip past the list. Expressed as a pattern rather than a filter so it survives
 * the operation's JSON schema — a keyword that schema cannot carry costs the whole tool.
 */
const CREDENTIAL_NAME_PATTERN = new RegExp(`^(?!(?:${RESERVED_CREDENTIAL_NAMES.join('|')})$)[A-Z][A-Z0-9_]*$`);

export const SessionCredential = Schema.Struct({
  token: Ref.Ref(AccessToken.AccessToken).annotate({
    description: 'The AccessToken object in this space holding the secret.',
  }),
  as: Schema.NonEmptyString.pipe(Schema.check(Schema.isPattern(CREDENTIAL_NAME_PATTERN))).annotate({
    description:
      'Environment variable the agent reads the secret as, e.g. "GH_TOKEN". Upper-case, and not a name that configures the container itself (PATH, NODE_OPTIONS, HTTP_PROXY, …).',
  }),
});
export interface SessionCredential extends Schema.Schema.Type<typeof SessionCredential> {}

/**
 * A run of a {@link ClaudeManagedAgent.ClaudeManagedAgent}: one Anthropic-hosted session and its
 * container. The server's `sess_…` id is held as a foreign key so the transcript can be read back
 * later; the events stay on Anthropic's side and are fetched on demand rather than mirrored here.
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
    environmentId: Schema.String.annotate({ title: 'Environment id' }),
    /**
     * Vault (`vlt_…`) holding the credentials bound to this run. Recorded because `vault_ids` is
     * fixed at session creation: editing a live session's credentials means editing this vault.
     */
    vaultId: Schema.optional(Schema.String.annotate({ title: 'Vault id' })),
    /**
     * Last observed session status, as reported by the API (`running`, `idle`, `terminated`, …).
     * Held as a plain string so a status added server-side does not fail decoding.
     */
    status: Schema.optional(Schema.String.annotate({ title: 'Status' })),
    /** Why the agent last stopped, when it went idle (e.g. `end_turn`, `requires_action`). */
    stopReason: Schema.optional(Schema.String.annotate({ title: 'Stop reason' })),
    /**
     * The AccessToken refs bound to this run, by the variable the agent reads them as. Recorded
     * because the vault holds only the resolved VALUE: an OAuth token that rotates in the space
     * leaves the vault stale, and re-reading it needs the ref the value came from.
     */
    credentials: Schema.optional(
      Schema.Array(SessionCredential).annotate({ description: 'Credentials bound to this run.' }),
    ),
  }).pipe(
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--terminal-window--regular', hue: 'indigo' }),
  ),
) {}

/** The session's `sess_…` id, held as a foreign key: it identifies this run in Anthropic's system. */
export const getSessionId = (session: ClaudeAgentSession): string | undefined =>
  Obj.getKeys(session, ANTHROPIC_SOURCE)[0]?.id;

/** Creates a ClaudeAgentSession object, keyed by the Anthropic session id. */
export const make = ({
  sessionId,
  ...props
}: Obj.MakeProps<typeof ClaudeAgentSession> & { sessionId: string }): ClaudeAgentSession =>
  Obj.make(ClaudeAgentSession, { ...props, [Obj.Meta]: { keys: [{ source: ANTHROPIC_SOURCE, id: sessionId }] } });
