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
//
// Copyright 2023 DXOS.org
//

export const devtoolsFormatter = Symbol.for('devtoolsFormatter');

export type JsonML = [string, { [key: string]: any }?, ...(JsonML | string)[]];

export interface DevtoolsFormatter<_> {
  /**
   * NOTE: Make sure to do an instance check and return null if the object is not of the correct type.
   */
  header: () => JsonML | null;
  hasBody?: () => boolean;
  body?: () => JsonML | null;
}

const register = () => {
  if (typeof window !== 'undefined') {
    ((window as any).devtoolsFormatters ??= []).push({
      header: (value: any) => {
        const formatter = value[devtoolsFormatter];
        if (formatter === undefined) {
          return null;
        }
        if (typeof formatter !== 'object' || formatter === null || typeof formatter.header !== 'function') {
          throw new Error(`Invalid devtools formatter for ${value.constructor.name}`);
        }

        return formatter.header();
      },
      hasBody: (value: any) => {
        const formatter = value[devtoolsFormatter];
        if (!formatter || !formatter.hasBody) {
          return false;
        }

        return formatter.hasBody();
      },
      body: (value: any) => {
        const formatter = value[devtoolsFormatter];
        if (!formatter || !formatter.body) {
          return null;
        }

        return formatter.body();
      }
    });
  }
};

register();
