//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import {
  InstrumentArticle,
  InstrumentCard,
  PortfolioArticle,
  PortfolioProperties,
  PortfolioReportDetail,
} from '#containers';

import { Ibkr } from '../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'portfolioArticle',
        // Article view for the navigable Portfolio owner; `AppSurface.object` narrows
        // `data.subject` to a Portfolio, whose backing feed holds the stored reports.
        filter: AppSurface.object(AppSurface.Article, Ibkr.Portfolio),
        component: PortfolioArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'portfolioProperties',
        // Companion properties panel for the Portfolio; carries the daily-sync trigger control.
        filter: AppSurface.object(AppSurface.ObjectProperties, Ibkr.Portfolio),
        component: PortfolioProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'portfolioReportDetail',
        // Complementary plank opened when a PortfolioReport is selected in the PortfolioArticle list.
        // The app-graph-builder resolves the selected report as the companion node's subject.
        filter: AppSurface.allOf(
          AppSurface.object(AppSurface.Article, Ibkr.Report),
          AppSurface.companion(AppSurface.Article, Ibkr.Portfolio),
        ),
        component: PortfolioReportDetail,
        props: ({ role, data: { subject, companionTo } }) => ({ role, subject, companionTo }),
      }),
      Surface.create({
        id: 'instrumentArticle',
        filter: AppSurface.object(AppSurface.Article, Ibkr.Instrument),
        component: InstrumentArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'instrumentCard',
        filter: AppSurface.object(AppSurface.CardContent, Ibkr.Instrument),
        component: InstrumentCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
    ]),
  ),
);
