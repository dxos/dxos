import { useEffect } from "react";

export function useEvent(event: string, handler: Function): void;
export function useEvent(
  rootObject: any,
  eventName: string | Function,
  handler?: Function
): void;
export function useEvent(
  rootObject: any,
  eventName: string | Function,
  handler?: Function
): void {
  const root = typeof rootObject == "string" ? (typeof window != 'undefined' ? window : null) : rootObject;
  const event =
    typeof rootObject == "string"
      ? rootObject
      : typeof eventName == "string"
      ? eventName
    : null;
  const handlerFunction: Function =
    typeof eventName == "string" ? handler! : eventName;
  return useEffect(() => {
    if (root && event && handlerFunction) {
      root.addEventListener(event, handlerFunction as any);
    }
    return () => root.removeEventListener(event, handlerFunction as any);
  }, []);
}