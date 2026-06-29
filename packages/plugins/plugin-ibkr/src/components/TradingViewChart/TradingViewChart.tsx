//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

const ADVANCED_CHART_WIDGET = 'https://s.tradingview.com/embed-widget/advanced-chart/';
const MINI_CHART_WIDGET = 'https://s.tradingview.com/embed-widget/mini-symbol-overview/';

export type TradingViewChartProps = {
  symbol: string;
  theme?: 'light' | 'dark';
  className?: string;
  /** Advanced chart for article surfaces; mini overview for compact cards. */
  variant?: 'advanced' | 'mini';
};

const buildEmbedUrl = (
  symbol: string,
  theme: 'light' | 'dark',
  variant: NonNullable<TradingViewChartProps['variant']>,
): string => {
  const config =
    variant === 'mini'
      ? {
          symbol,
          width: '100%',
          height: '100%',
          locale: 'en',
          dateRange: '12M',
          colorTheme: theme,
          isTransparent: false,
          autosize: true,
        }
      : {
          autosize: true,
          symbol,
          interval: 'D',
          timezone: 'Etc/UTC',
          theme,
          style: '1',
          locale: 'en',
          allow_symbol_change: false,
          support_host: 'https://www.tradingview.com',
        };

  const widget = variant === 'mini' ? MINI_CHART_WIDGET : ADVANCED_CHART_WIDGET;
  return `${widget}?locale=en#${encodeURIComponent(JSON.stringify(config))}`;
};

/** Presentation-only TradingView chart iframe; market data is fetched by TradingView client-side. */
export const TradingViewChart = ({
  symbol,
  theme = 'dark',
  className,
  variant = 'advanced',
}: TradingViewChartProps) => {
  const src = useMemo(
    () => (symbol ? buildEmbedUrl(symbol, theme, variant) : undefined),
    [symbol, theme, variant],
  );

  if (!src) {
    return null;
  }

  return (
    <iframe
      title={`TradingView chart for ${symbol}`}
      src={src}
      className={className ?? 'h-[480px] w-full border-0'}
      allow='fullscreen'
      loading='lazy'
    />
  );
};
