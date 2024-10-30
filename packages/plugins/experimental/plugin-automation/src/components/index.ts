//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const ChainArticle = lazy(() => import('./ChainArticle'));
export const TriggerArticle = lazy(() => import('./TriggerContainer'));
export const TriggerSection = lazy(() => import('./TriggerSection'));

export * from './AutomationPanel';
export * from './Chain';
export * from './PromptTemplate';
