//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const PortfolioArticle: ComponentType<any> = lazy(() => import('./PortfolioArticle/index.ts'));
export const PortfolioProperties: ComponentType<any> = lazy(() => import('./PortfolioProperties/index.ts'));
export const PortfolioReportDetail: ComponentType<any> = lazy(() => import('./PortfolioReportDetail/index.ts'));
export const InstrumentArticle: ComponentType<any> = lazy(() => import('./InstrumentArticle/index.ts'));
export const InstrumentCard: ComponentType<any> = lazy(() => import('./InstrumentCard/index.ts'));
