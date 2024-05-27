//
// Copyright 2023 DXOS.org
//

/**
 * Lets types provide custom formatters for the Chrome Devtools.
 *
 * https://www.mattzeunert.com/2016/02/19/custom-chrome-devtools-object-formatters.html
 * NOTE: Must be enabled in chrome devtools preferences.
 *
 * @example
 * ```typescript
 * class MyType {
 *  get [devtoolsFormatter] (): DevtoolsFormatter {
 *    ...
 *  }
 * ```
 */

export const devtoolsFormatter = Symbol.for('devtoolsFormatter');

export type JsonML = [string, Record<string, any>?, ...(JsonML | string)[]];

export interface DevtoolsFormatter {
  /**
   * NOTE: Make sure to do an instance check and return null if the object is not of the correct type.
   */
  header: (config?: any) => JsonML | null;
  hasBody?: (config?: any) => boolean;
  body?: (config?: any) => JsonML | null;
}

/**
 * Types that implement this interface can provide custom formatters for the Chrome Devtools.
 *
 * https://firefox-source-docs.mozilla.org/devtools-user/custom_formatters/index.html
 */
export interface CustomDevtoolsFormattable {
  get [devtoolsFormatter](): DevtoolsFormatter;
}

const register = () => {
  if (typeof window !== 'undefined') {
    ((window as any).devtoolsFormatters ??= []).push({
      header: (value: any, config: any) => {
        const formatter = value[devtoolsFormatter];
        if (formatter === undefined) {
          return null;
        }
        if (typeof formatter !== 'object' || formatter === null || typeof formatter.header !== 'function') {
          throw new Error(`Invalid devtools formatter for ${value.constructor.name}`);
        }

        return formatter.header(config);
      },
      hasBody: (value: any, config: any) => {
        const formatter = value[devtoolsFormatter];
        if (!formatter || !formatter.hasBody) {
          return false;
        }

        return formatter.hasBody(config);
      },
      body: (value: any, config: any) => {
        const formatter = value[devtoolsFormatter];
        if (!formatter || !formatter.body) {
          return null;
        }

        return formatter.body(config);
      },
    });
  }
};

register();
