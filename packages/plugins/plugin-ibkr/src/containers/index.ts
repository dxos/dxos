//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const PortfolioArticle: ComponentType<any> = lazy(() => import('./PortfolioArticle'));
export const PortfolioProperties: ComponentType<any> = lazy(() => import('./PortfolioProperties'));
export const PortfolioReportDetail: ComponentType<any> = lazy(() => import('./PortfolioReportDetail'));
export const InstrumentArticle: ComponentType<any> = lazy(() => import('./InstrumentArticle'));
export const InstrumentCard: ComponentType<any> = lazy(() => import('./InstrumentCard'));
