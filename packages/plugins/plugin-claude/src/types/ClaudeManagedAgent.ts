//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import { ANTHROPIC_SOURCE } from '../constants.ts';

/** Default model for a newly created agent. */
export const DEFAULT_MODEL = 'claude-opus-5';

/**
 * The built-in toolset that gives a managed agent bash, file operations and code execution inside
 * its session container. Dated identifier — Anthropic versions toolsets by release date.
 */
export const DEFAULT_TOOLSET = 'agent_toolset_20260401';

/** Effort levels accepted by the managed agent's model configuration. */
export const Effort = Schema.Literals(['low', 'medium', 'high', 'xhigh', 'max']);
export type Effort = typeof Effort.Type;

/** Lifecycle of the local record relative to the agent Anthropic hosts. */
export const Status = Schema.Literals(['draft', 'deployed', 'archived']);
export type Status = typeof Status.Type;

/** An MCP server the agent may call, addressed by URL. */
export const McpServer = Schema.Struct({
  name: Schema.String.annotate({ title: 'Name' }),
  url: Schema.String.annotate({ title: 'URL' }),
});
export interface McpServer extends Schema.Schema.Type<typeof McpServer> {}

/**
 * A Claude managed agent: the versioned configuration Anthropic stores and runs on your behalf.
 *
 * The object is the source of truth for the configuration; the Anthropic `agent_…` id lives in the
 * object's foreign keys and `agentVersion` records the last deploy, both absent until first deploy.
 */
export class ClaudeManagedAgent extends Type.makeObject<ClaudeManagedAgent>(
  DXN.make('org.dxos.type.claudeManagedAgent', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' })),
    description: Schema.optional(Schema.String.annotate({ title: 'Description' })),
    model: Schema.String.pipe(Schema.annotate({ title: 'Model', description: 'Anthropic model id.' })),
    effort: Schema.optional(Effort.annotate({ title: 'Effort' })),
    systemPrompt: Schema.optional(
      Schema.String.pipe(
        Format.FormatAnnotation.set(Format.TypeFormat.Text),
        Schema.annotate({ title: 'System prompt' }),
      ),
    ),
    /** Toolset type identifiers passed through to the agent's `tools` array. */
    tools: Schema.optional(Schema.Array(Schema.String).annotate({ title: 'Toolsets' })),
    /** Anthropic-provided skill ids (e.g. `xlsx`, `pptx`). */
    skills: Schema.optional(Schema.Array(Schema.String).annotate({ title: 'Skills' })),
    mcpServers: Schema.optional(Schema.Array(McpServer).annotate({ title: 'MCP servers' })),
    /**
     * The environment sessions are created in. Sessions cannot be started without one, but an agent
     * may be configured (and deployed) before an environment has been provisioned.
     */
    environmentId: Schema.optional(Schema.String.annotate({ title: 'Environment id' })),
    /** Server-assigned version of the last deploy, used for optimistic concurrency on update. */
    agentVersion: Schema.optional(Schema.Number.annotate({ title: 'Agent version' })),
    status: Status.annotate({ title: 'Status' }),
  }).pipe(LabelAnnotation.set(['name']), Annotation.IconAnnotation.set({ icon: 'ph--robot--regular', hue: 'indigo' })),
) {}

/**
 * The agent's `agent_…` id, held as a foreign key rather than a field: it identifies this object in
 * Anthropic's system, so a deployed agent is addressable with `Filter.foreignKeys`.
 */
export const getAgentId = (agent: ClaudeManagedAgent): string | undefined =>
  Obj.getKeys(agent, ANTHROPIC_SOURCE)[0]?.id;

/** Stamps the deployed id onto the agent. Must be called within an `Obj.update` callback. */
export const setAgentId = (agent: ClaudeManagedAgent, agentId: string): void => {
  Obj.deleteKeys(agent, ANTHROPIC_SOURCE);
  Obj.getMeta(agent).keys.push({ source: ANTHROPIC_SOURCE, id: agentId });
};

/** Creates a ClaudeManagedAgent object, defaulting the model, toolset and status. */
export const make = ({
  model = DEFAULT_MODEL,
  tools = [DEFAULT_TOOLSET],
  status = 'draft',
  ...props
}: Partial<Obj.MakeProps<typeof ClaudeManagedAgent>> & { name: string }): ClaudeManagedAgent =>
  Obj.make(ClaudeManagedAgent, { model, tools, status, ...props });
