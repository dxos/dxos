import { inspect } from "node:util";
import type { LogMethods } from "./log";
import { CallMetadata } from "./meta";

export const createMethodLogDecorator = (log: LogMethods) => (arg0?: never, arg1?: never, meta?: CallMetadata): MethodDecorator =>
  (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const method = descriptor.value!;
    descriptor.value = function (this: any, ...args: any) {
      const combinedMeta = {
        ...(meta ?? {}),
        S: this as any,
      } as CallMetadata;

      const formattedArgs = args.map((arg: any) => inspect(arg, false, 1, true)).join(', ');

      try {
        const result = method.apply(this, args);
        log.info(`${propertyKey as string}(${formattedArgs}) => ${inspect(result, false, 1, true)}`, {}, combinedMeta);
      } catch (err) {
        log.error(`${propertyKey as string}(${formattedArgs}) 🔥 ${err}`, {}, combinedMeta);
        throw err;
      }
    }
    Object.defineProperty(descriptor.value, 'name', { value: (propertyKey as string) + '$log' });

  }