//
// Copyright 2025 DXOS.org
//

export type AudioChunk = {
  /**
   * Timestamp of the beginning of the chunk.
   */
  timestamp: number;

  /**
   * 16-bit PCM data.
   */
  data: Float64Array;
};

export type WavConfig = {
  channels: number;
  sampleRate: number;
  bitDepthCode: string;
};

/**
 * Records MediaStreamTrack to Uint8Array 16-bit PCM data.
 * The data is passed to the onChunk callback with the timestamp of the chunk.
 * All chunks are aligned and sequential.
 * Time ─────────────────────────────────────────────────►
 *
 * Recording:
 * t1    ┌──────┐
 * t2    ┌──────┬──────┐
 * t3    ┌──────┬──────┬──────┐
 * t4    ┌──────┬──────┬──────┬──────┐
 *       └──────┴──────┴──────┴──────┘
 *         1st     2nd     3rd     4th
 *        chunk   chunk   chunk   chunk
 *
 */
export interface AudioRecorder {
  wavConfig: WavConfig;

  /**
   * Sets callback for receiving audio chunks.
   */
  setOnChunk(onChunk: (chunk: AudioChunk) => void): void;

  /**
   * Starts the recorder.
   */
  start(): Promise<void>;

  /**
   * Stops the recorder.
   */
  stop(): Promise<void>;
}
