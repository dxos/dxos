//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const AssistantSettings: ComponentType<any> = lazy(() =>
  import('./AssistantSettings').then((m) => ({ default: m.AssistantSettings })),
);
export const BlueprintArticle: ComponentType<any> = lazy(() =>
  import('./BlueprintArticle').then((m) => ({ default: m.BlueprintArticle })),
);
export const ChatCompanion: ComponentType<any> = lazy(() =>
  import('./ChatCompanion').then((m) => ({ default: m.ChatCompanion })),
);
export const ChatContainer: ComponentType<any> = lazy(() =>
  import('./ChatContainer').then((m) => ({ default: m.ChatContainer })),
);
export const ChatDialog: ComponentType<any> = lazy(() =>
  import('./ChatDialog').then((m) => ({ default: m.ChatDialog })),
);
export const InitiativeContainer: ComponentType<any> = lazy(() =>
  import('./InitiativeContainer').then((m) => ({ default: m.InitiativeContainer })),
);
export const InitiativeSettings: ComponentType<any> = lazy(() =>
  import('./InitiativeSettings').then((m) => ({ default: m.InitiativeSettings })),
);
export const PromptArticle: ComponentType<any> = lazy(() =>
  import('./PromptArticle').then((m) => ({ default: m.PromptArticle })),
);
export const TriggerStatus: ComponentType<any> = lazy(() =>
  import('./TriggerStatus').then((m) => ({ default: m.TriggerStatus })),
);
