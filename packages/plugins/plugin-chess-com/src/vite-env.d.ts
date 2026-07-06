/// <reference types="vite/client" />

declare module '*.mdl?raw' {
  const content: string;
  export default content;
}
