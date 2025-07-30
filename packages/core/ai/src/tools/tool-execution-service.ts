export class ToolExecutionService extends Context.Tag('ToolExecutionService')<
  ToolExecutionService,
  {
    readonly handlersFor: <Tools extends AiTool.Any>(toolkit: AiToolkit.AiToolkit<Tools>) => AiTool.ToHandler<Tools>;
  }
>() {
  static layerEmpty = Layer.succeed(ToolExecutionService, {
    handlersFor: (toolkit) =>
      toolkit.of(
        Record.map(toolkit.tools, (tool, name) =>
          Effect.fail(new AiToolNotFoundError(`Tool not found: ${name}`)),
        ) as any,
      ) as any,
  });

  static handlersFor = Effect.serviceFunction(ToolExecutionService, (_) => _.handlersFor);
}
