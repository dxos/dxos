//
// Copyright 2024 DXOS.org
//

import { LLMTool, EchoDataSource } from '@dxos/assistant';
import { createCypherTool } from '@dxos/assistant/testing';
import type { Context } from '@dxos/context';
import { raise } from '@dxos/debug';
import { getSchemaTypename, S, StoredSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { ComputeNode, DEFAULT_OUTPUT, NoInput } from '../compute-node';
import { InvalidStateError, type StateMachineContext } from '../state-machine';

/**
 * Database GPT tool.
 */
export class Database extends ComputeNode<NoInput, { [DEFAULT_OUTPUT]: LLMTool }> {
  override readonly type = 'database';

  constructor() {
    super(NoInput, S.Struct({ [DEFAULT_OUTPUT]: LLMTool }));
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }

  override async onInitialize(ctx: Context, context: StateMachineContext): Promise<void> {
    invariant(context.space, 'space is required');
    const dataSource = new EchoDataSource(context.space.db);

    const types = [
      ...(await context.space.db.schemaRegistry.query().run()),
      ...context.space.db.graph.schemaRegistry.schemas.filter((schema) =>
        // TODO(dmaretskyi): Remove once we can serialize recursive schema.
        getSchemaTypename(schema)?.startsWith('example.org'),
      ),
    ].filter((schema) => getSchemaTypename(schema) !== StoredSchema.typename);
    this.setOutput({ [DEFAULT_OUTPUT]: createCypherTool(dataSource, types) });
  }
}
