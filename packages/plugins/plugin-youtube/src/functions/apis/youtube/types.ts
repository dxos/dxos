//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * YouTube API error response.
 */
export class YouTubeError extends Schema.TaggedError<YouTubeError>()('YouTubeError', {
  code: Schema.Number,
  message: Schema.String,
  status: Schema.optional(Schema.String),
}) {
  static fromErrorResponse(response: ErrorResponse) {
    return new YouTubeError({
      code: response.error.code,
      message: response.error.message,
      status: response.error.status,
    });
  }
}

export const ErrorResponse = Schema.Struct({
  error: Schema.Struct({
    code: Schema.Number,
    message: Schema.String,
    status: Schema.optional(Schema.String),
  }),
});

export type ErrorResponse = Schema.Schema.Type<typeof ErrorResponse>;

/**
 * YouTube channel snippet from search/channel API.
 */
export const ChannelSnippet = Schema.Struct({
  title: Schema.String,
  description: Schema.optional(Schema.String),
  customUrl: Schema.optional(Schema.String),
  publishedAt: Schema.optional(Schema.String),
  thumbnails: Schema.optional(
    Schema.Struct({
      default: Schema.optional(Schema.Struct({ url: Schema.String })),
      medium: Schema.optional(Schema.Struct({ url: Schema.String })),
      high: Schema.optional(Schema.Struct({ url: Schema.String })),
    }),
  ),
});

/**
 * YouTube channel item from channels API.
 */
export const ChannelItem = Schema.Struct({
  kind: Schema.String,
  etag: Schema.String,
  id: Schema.String,
  snippet: Schema.optional(ChannelSnippet),
  contentDetails: Schema.optional(
    Schema.Struct({
      relatedPlaylists: Schema.optional(
        Schema.Struct({
          uploads: Schema.optional(Schema.String),
        }),
      ),
    }),
  ),
});

/**
 * YouTube channels list response.
 */
export const ChannelsResponse = Schema.Struct({
  kind: Schema.String,
  etag: Schema.String,
  pageInfo: Schema.optional(
    Schema.Struct({
      totalResults: Schema.Number,
      resultsPerPage: Schema.Number,
    }),
  ),
  items: Schema.Array(ChannelItem),
});

export type ChannelsResponse = Schema.Schema.Type<typeof ChannelsResponse>;

/**
 * Video snippet from search/playlistItems API.
 */
export const VideoSnippet = Schema.Struct({
  publishedAt: Schema.String,
  channelId: Schema.optional(Schema.String),
  title: Schema.String,
  description: Schema.optional(Schema.String),
  thumbnails: Schema.optional(
    Schema.Struct({
      default: Schema.optional(Schema.Struct({ url: Schema.String })),
      medium: Schema.optional(Schema.Struct({ url: Schema.String })),
      high: Schema.optional(Schema.Struct({ url: Schema.String })),
      standard: Schema.optional(Schema.Struct({ url: Schema.String })),
      maxres: Schema.optional(Schema.Struct({ url: Schema.String })),
    }),
  ),
  channelTitle: Schema.optional(Schema.String),
  playlistId: Schema.optional(Schema.String),
  position: Schema.optional(Schema.Number),
  resourceId: Schema.optional(
    Schema.Struct({
      kind: Schema.String,
      videoId: Schema.String,
    }),
  ),
});

/**
 * Content details for a video.
 */
export const VideoContentDetails = Schema.Struct({
  videoId: Schema.optional(Schema.String),
  videoPublishedAt: Schema.optional(Schema.String),
  duration: Schema.optional(Schema.String),
});

/**
 * Video statistics.
 */
export const VideoStatistics = Schema.Struct({
  viewCount: Schema.optional(Schema.String),
  likeCount: Schema.optional(Schema.String),
  commentCount: Schema.optional(Schema.String),
});

/**
 * Video item from videos API.
 */
export const VideoItem = Schema.Struct({
  kind: Schema.String,
  etag: Schema.String,
  id: Schema.String,
  snippet: Schema.optional(VideoSnippet),
  contentDetails: Schema.optional(VideoContentDetails),
  statistics: Schema.optional(VideoStatistics),
});

/**
 * YouTube videos list response.
 */
export const VideosResponse = Schema.Struct({
  kind: Schema.String,
  etag: Schema.String,
  nextPageToken: Schema.optional(Schema.String),
  prevPageToken: Schema.optional(Schema.String),
  pageInfo: Schema.optional(
    Schema.Struct({
      totalResults: Schema.Number,
      resultsPerPage: Schema.Number,
    }),
  ),
  items: Schema.Array(VideoItem),
});

export type VideosResponse = Schema.Schema.Type<typeof VideosResponse>;

/**
 * Playlist item from playlistItems API.
 */
export const PlaylistItem = Schema.Struct({
  kind: Schema.String,
  etag: Schema.String,
  id: Schema.String,
  snippet: Schema.optional(VideoSnippet),
  contentDetails: Schema.optional(VideoContentDetails),
});

/**
 * YouTube playlist items response.
 */
export const PlaylistItemsResponse = Schema.Struct({
  kind: Schema.String,
  etag: Schema.String,
  nextPageToken: Schema.optional(Schema.String),
  prevPageToken: Schema.optional(Schema.String),
  pageInfo: Schema.optional(
    Schema.Struct({
      totalResults: Schema.Number,
      resultsPerPage: Schema.Number,
    }),
  ),
  items: Schema.Array(PlaylistItem),
});

export type PlaylistItemsResponse = Schema.Schema.Type<typeof PlaylistItemsResponse>;

/**
 * Search result item.
 */
export const SearchItem = Schema.Struct({
  kind: Schema.String,
  etag: Schema.String,
  id: Schema.Struct({
    kind: Schema.String,
    videoId: Schema.optional(Schema.String),
    channelId: Schema.optional(Schema.String),
    playlistId: Schema.optional(Schema.String),
  }),
  snippet: Schema.optional(VideoSnippet),
});

/**
 * YouTube search response.
 */
export const SearchResponse = Schema.Struct({
  kind: Schema.String,
  etag: Schema.String,
  nextPageToken: Schema.optional(Schema.String),
  prevPageToken: Schema.optional(Schema.String),
  pageInfo: Schema.optional(
    Schema.Struct({
      totalResults: Schema.Number,
      resultsPerPage: Schema.Number,
    }),
  ),
  items: Schema.Array(SearchItem),
});

export type SearchResponse = Schema.Schema.Type<typeof SearchResponse>;
