// TODO(burdon): Ai prefix?
export class ToolResolverService extends Context.Tag('ToolResolverService')<
  ToolResolverService,
  {
    readonly resolve: (id: ToolId) => Effect.Effect<AiTool.Any, AiToolNotFoundError>;
  }
>() {
  static layerEmpty = Layer.succeed(ToolResolverService, {
    resolve: (id) => Effect.fail(new AiToolNotFoundError(`Tool not found: ${id}`)),
  });

  static resolve = Effect.serviceFunctionEffect(ToolResolverService, (_) => _.resolve);

  static resolveToolkit: (
    ids: ToolId[],
  ) => Effect.Effect<AiToolkit.AiToolkit<AiTool.Any>, AiToolNotFoundError, ToolResolverService> = (ids) =>
    Effect.gen(function* () {
      const tools = yield* Effect.all(ids.map(ToolResolverService.resolve));
      return AiToolkit.make(...tools);
    });
}
