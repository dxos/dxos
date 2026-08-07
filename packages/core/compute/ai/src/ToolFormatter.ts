//
// Copyright 2026 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import * as Context from 'effect/Context';
import type * as Schema from 'effect/Schema';

export interface FormattingOptions<Tool extends Tool.Any> {
  readonly debugFormatCall?: (parameters: Tool.Parameters<Tool>) => string | unknown;
  readonly debugFormatResult?: (result: Tool.Result<Tool>) => string | unknown;
}

/**
 * Formats the tool call or result into a string.
 */
export class ToolFormatter extends Context.Service<ToolFormatter, FormattingOptions<Tool.Any>>()(
  '@dxos/ai/ToolFormatter',
) {}

export const assign =
  <Tool extends AnyTool>(options: FormattingOptions<Tool>) =>
  (tool: Tool): Tool =>
    tool.annotate(ToolFormatter, options) as Tool;

type AnyTool = Tool.Tool<
  string,
  {
    readonly parameters: Tool.AnyStructSchema;
    readonly success: Schema.Top;
    readonly failure: Schema.Top;
    readonly failureMode: Tool.FailureMode;
  },
  any
>;
