//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { PortfolioArticle, PortfolioProperties, PortfolioReportDetail, InstrumentArticle, InstrumentCard } from '#containers';

import { Ibkr } from '../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'portfolioArticle',
        // Article view for the navigable Portfolio owner; `AppSurface.object` narrows
        // `data.subject` to a Portfolio, whose backing feed holds the stored reports.
        filter: AppSurface.object(AppSurface.Article, Ibkr.Portfolio),
        component: ({ data, role }) => (
          <PortfolioArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'portfolioProperties',
        // Companion properties panel for the Portfolio; carries the daily-sync trigger control.
        filter: AppSurface.object(AppSurface.ObjectProperties, Ibkr.Portfolio),
        component: ({ data }) => <PortfolioProperties subject={data.subject} />,
      }),
      Surface.create({
        id: 'portfolioReportDetail',
        // Complementary plank opened when a PortfolioReport is selected in the PortfolioArticle list.
        // The app-graph-builder resolves the selected report as the companion node's subject.
        filter: AppSurface.allOf(
          AppSurface.object(AppSurface.Article, Ibkr.Report),
          AppSurface.companion(AppSurface.Article, Ibkr.Portfolio),
        ),
        component: ({ data, role }) => <PortfolioReportDetail role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: 'instrumentArticle',
        filter: AppSurface.object(AppSurface.Article, Ibkr.Instrument),
        component: ({ data, role }) => (
          <InstrumentArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'instrumentCard',
        filter: AppSurface.object(AppSurface.CardContent, Ibkr.Instrument),
        component: ({ data, role }) => <InstrumentCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
