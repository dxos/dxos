import { Context } from "./context";

export const cancelWithContext = <T> (ctx: Context, promise: Promise<T>): Promise<T> => {
  const error = new Error('Cancelled');
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      ctx.onDispose(() => reject(error));
    })
  ])
}