//
// Copyright 2024 DXOS.org
//

export type Env = {
  USER_DIRECTORY_URL?: string;
  FEEDBACK_URL?: string;
  FEEDBACK_QUEUE?: Queue;
  FEEDBACK_STORAGE?: KVNamespace;
  CALLS_APP_ID: string;
  CALLS_APP_SECRET: string;
  TURN_SERVICE_ID?: string;
  TURN_SERVICE_TOKEN?: string;
  TRACE_LINK?: string;
  API_EXTRA_PARAMS?: string;
  // limiters: DurableObjectNamespace
  rooms: DurableObjectNamespace;
  MAX_WEBCAM_FRAMERATE?: string;
  MAX_WEBCAM_BITRATE?: string;
  MAX_WEBCAM_QUALITY_LEVEL?: string;
  MAX_API_HISTORY?: string;
};
