//
// Copyright 2024 DXOS.org
//

import { LLMTool, EchoDataSource, type LLMToolDefinition } from '@dxos/assistant';
import { createCypherTool } from '@dxos/assistant/testing';
import { raise } from '@dxos/debug';
import { getSchemaTypename, S, StoredSchema } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';
import { InvalidStateError, type StateMachineContext } from '../state-machine';
import type { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { createOutputSchema } from '../../shapes/defs';
import { DEFAULT_OUTPUT } from '../../../shapes';
import { log } from '@dxos/log';

/**
 * Database GPT tool.
 */
export class Database extends ComputeNode<void, { [DEFAULT_OUTPUT]: LLMToolDefinition }> {
  override readonly type = 'database';

  constructor() {
    super(S.Void, createOutputSchema(LLMTool));
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }

  override async onInitialize(ctx: Context, context: StateMachineContext): Promise<void> {
    invariant(context.space, 'space is required');
    const dataSource = new EchoDataSource(context.space.db);

    const types = [
      ...(await context.space.db.schemaRegistry.query().run()),
      ...context.space.db.graph.schemaRegistry.schemas,
    ].filter((schema) => getSchemaTypename(schema) !== StoredSchema.typename);
    log.info('TYPES', { types });

    this.setOutput({ [DEFAULT_OUTPUT]: createCypherTool(dataSource, types) });
  }
}
