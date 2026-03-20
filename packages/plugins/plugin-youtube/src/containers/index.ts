//
// Copyright 2024 DXOS.org
//

import { type ComponentType, lazy, type LazyExoticComponent } from 'react';

import type { ChannelArticleProps } from './ChannelArticle/ChannelArticle';
import type { ChannelSettingsProps } from './ChannelSettings/ChannelSettings';
import type { VideoArticleProps } from './VideoArticle/VideoArticle';
import type { VideoCardProps } from './VideoCard/VideoCard';

export type { ChannelArticleProps, ChannelSettingsProps, VideoArticleProps, VideoCardProps };

export const ChannelArticle: LazyExoticComponent<ComponentType<ChannelArticleProps>> = lazy(
  () => import('./ChannelArticle'),
);

export const ChannelSettings: LazyExoticComponent<ComponentType<ChannelSettingsProps>> = lazy(
  () => import('./ChannelSettings'),
);

export const VideoArticle: LazyExoticComponent<ComponentType<VideoArticleProps>> = lazy(
  () => import('./VideoArticle'),
);

export const VideoCard: LazyExoticComponent<ComponentType<VideoCardProps>> = lazy(() => import('./VideoCard'));
