//
// Copyright 2021 DXOS.org
//

// V8/Node.js extension absent from TypeScript's standard ErrorConstructor;
// declared here because packages with `"types": ["@dxos/typings"]` in their
// tsconfig cannot rely on @types/node to supply it.
interface ErrorConstructor {
  captureStackTrace(targetObject: object, constructorOpt?: Function): void;
}

declare module 'buffer-json-encoding';
declare module 'end-of-stream-promise';
declare module 'signal-promise';
declare module 'y-monaco';
declare module 'react-flame-graph';

declare module '*.css';
declare module '*.pcss';
declare module '@dxos-theme';
