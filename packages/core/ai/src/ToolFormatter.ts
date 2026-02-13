import * as Context from 'effect/Context';
import * as Tool from '@effect/ai/Tool';
import type { Schema } from 'effect';
import { dbg } from '@dxos/log';

export interface FormattingOptions<Tool extends Tool.Any> {
  readonly debugFormatCall?: (parameters: Tool.Parameters<Tool>) => string | unknown;
  readonly debugFormatResult?: (result: Tool.Result<Tool>) => string | unknown;
}

/**
 * Formats the tool call or result into a string.
 */
export class ToolFormatter extends Context.Tag('@dxos/ai/ToolFormatter')<
  ToolFormatter,
  FormattingOptions<Tool.Any>
>() {}

export const assign =
  <Tool extends AnyTool>(options: FormattingOptions<Tool>) =>
  (tool: Tool): Tool =>
    dbg(tool).annotate(ToolFormatter, options) as Tool;

type AnyTool = Tool.Tool<
  string,
  {
    readonly parameters: Tool.AnyStructSchema;
    readonly success: Schema.Schema.Any;
    readonly failure: Schema.Schema.All;
    readonly failureMode: Tool.FailureMode;
  },
  any
>;
