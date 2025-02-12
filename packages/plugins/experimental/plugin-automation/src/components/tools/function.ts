import { defineTool, ToolResult } from '@dxos/artifact';
import { getMeta } from '@dxos/react-client/echo';
import { getInvocationUrl } from '@dxos/functions';
import { getUserFunctionUrlInMetadata } from '@dxos/functions';
import type { Tool } from '@dxos/artifact';
import type { FunctionType } from '@dxos/functions';
import type { SpaceId } from '@dxos/react-client/echo';
import { toEffectSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';

export const covertFunctionToTool = (
  fn: FunctionType,
  edgeUrl: string,
  spaceId?: SpaceId | undefined,
): Tool | undefined => {
  if (!fn.description || !fn.inputSchema) return undefined;

  const existingFunctionUrl = getUserFunctionUrlInMetadata(getMeta(fn));
  if (!existingFunctionUrl) return undefined;
  const url = getInvocationUrl(existingFunctionUrl, edgeUrl, {
    spaceId: spaceId,
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
