//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

export { AgentKnowledge as Root } from './containers/AgentKnowledge/AgentKnowledge.tsx';
export type { AgentKnowledgeProps as RootProps } from './containers/AgentKnowledge/AgentKnowledge.tsx';
export {
  EntityBrowser as Browser,
  EntityCard as Card,
  propertyKey,
  related,
  toEntityCards,
} from './components/AgentKnowledge/index.ts';
export type {
  EntityBrowserProps as BrowserProps,
  BrowseSelection,
  EntityCardModel as CardModel,
  EntityCardOptions as CardOptions,
  EntityCardProperty as CardProperty,
  EntityCardProps as CardProps,
  EntityCardValue as CardValue,
} from './components/AgentKnowledge/index.ts';
