/**
 * Lets types provide custom formatters for the Chrome Devtools.
 * 
 * https://www.mattzeunert.com/2016/02/19/custom-chrome-devtools-object-formatters.html
 * NOTE: Must be enabled in chrome devtools preferences.
 * 
 * @example
 * ```typescript
 * class MyType {
 *  get [devtoolsFormatter] (): DevtoolsFormatter<MyType> {
 *    ...
 *  }
 * ```
 */
export const devtoolsFormatter = Symbol.for('devtoolsFormatter');

export type JsonML = [string, { [key: string]: any }?, ...(JsonML | string)[]];

export interface DevtoolsFormatter<T> {
  /**
   * NOTE: Make sure to do an instance check and return null if the object is not of the correct type.
   */
  header(value: T): JsonML | null;
  hasBody?(value: T): boolean;
  body?(value: T): JsonML | null;
}

function register() {
  if (typeof window !== 'undefined') {
    ((window as any).devtoolsFormatters ??= []).push({
      header(value: any) {
        const formatter = value[devtoolsFormatter];
        if(!formatter) return null

        return formatter.header(value);
      },
      hasBody(value: any) {
        const formatter = value[devtoolsFormatter];
        if(!formatter || !formatter.hasBody) return false

        return formatter.hasBody(value);
      },
      body(value: any) {
        const formatter = value[devtoolsFormatter];
        if(!formatter || !formatter.body) return null
        
        return formatter.body(value);
      }
    });
  }
}

register()