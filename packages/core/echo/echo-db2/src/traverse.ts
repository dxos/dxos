import { EchoObject } from "./object";

export function traverse(traverse: (touch: (obj: EchoObject) => any) => void, onTouch: (obj: EchoObject) => any) {
  const createNoopProxy = (): any => {
    return new Proxy({}, {
      get(target, prop) {
        return createNoopProxy();
      },
    })
  }

  const touch = (obj: EchoObject): any => {
    onTouch(obj);
    return new Proxy(obj, {
      get(target, prop) {
        if(typeof prop === 'symbol') {
          return null;
        }
        const value = obj[prop as any];
        console.log('get', prop, value)

        if(value instanceof EchoObject) {
          return touch(value);
        } else {
          return createNoopProxy();
        }

      },
      set(target, prop, value) {
        throw new Error('Cannot set property on traversed object');
      }
    })
  }

  traverse(touch)
}