# Skill Structure

```ts
// <skill>/index.ts — thin re-export
export { default as XSkill } from './skill';
export { XSkillHandlers, XSkillOperations } from './operations';
```

```ts
// <skill>/operations/index.ts — single source of both aggregates
export * as XSkillOperations from './definitions';
export const XHandlers = OperationHandlerSet.lazy(...);
```
