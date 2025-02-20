//
// Copyright 2025 DXOS.org
//

import { defineTool, ToolResult } from '@dxos/artifact';
import type { Tool } from '@dxos/artifact';
import { toEffectSchema } from '@dxos/echo-schema';
import { getInvocationUrl, getUserFunctionUrlInMetadata } from '@dxos/functions';
import type { FunctionType } from '@dxos/functions';
import { log } from '@dxos/log';
import type { SpaceId } from '@dxos/react-client/echo';
import { getMeta } from '@dxos/react-client/echo';

export const covertFunctionToTool = (
  fn: FunctionType,
  edgeUrl: string,
  spaceId?: SpaceId | undefined,
): Tool | undefined => {
  if (!fn.description || !fn.inputSchema) {
    return undefined;
  }

  const existingFunctionUrl = getUserFunctionUrlInMetadata(getMeta(fn));
  if (!existingFunctionUrl) {
    return undefined;
  }
  const url = getInvocationUrl(existingFunctionUrl, edgeUrl, {
    spaceId,
  });

  return defineTool({
    name: fn.name,
    description: fn.description,
    schema: toEffectSchema(fn.inputSchema),
    execute: async (input) => {
      log.info('execute function tool', { name: fn.name, url, input });
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      return ToolResult.Success(await response.text());
    },
  });
};
