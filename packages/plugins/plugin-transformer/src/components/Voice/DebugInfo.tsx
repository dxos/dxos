//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

export type DebugInfoProps = {
  error: string;
  isModelLoading: boolean;
  stream: MediaStream | null;
  isTranscribing: boolean;
  transcription: string;
  audioLevel: number;
  gpuInfo: string;
  model: string;
  debug: boolean;
};

export const DebugInfo: FC<Partial<DebugInfoProps>> = ({
  error,
  isModelLoading,
  stream,
  isTranscribing,
  transcription,
  audioLevel,
  gpuInfo,
  model,
  debug = false,
}) => {
  return (
    <div className='p-4'>
      {error && (
        <div className='mb-4 text-error-text'>
          <strong>Error:</strong> {error}
        </div>
      )}
      {isModelLoading && (
        <div className='mb-4'>
          <div>Loading model...</div>
          <div className='text-sm text-fg-muted'>This may take a few moments</div>
        </div>
      )}
      {stream ? (
        <div>
          <div className='mb-2 text-success-text'>
            <strong>Status:</strong> Microphone is active
            {debug && audioLevel && (
              <div className='mt-2 w-48 h-5 bg-neutral-surface rounded-sm relative'>
                <div
                  className='h-full bg-success-bg transition-all duration-100 rounded-sm'
                  style={{ width: `${(audioLevel / 255) * 100}%` }}
                />
              </div>
            )}
          </div>
          {isTranscribing && <div className='mb-2 text-fg-muted'>Processing audio...</div>}
          {debug && (
            <div className='mb-4 text-sm text-fg-muted space-y-1'>
              <div>Model: {model}</div>
              <div>Sample Rate: 16000 Hz</div>
              <div>Format: audio/wav</div>
              <div>Chunk Size: 10 seconds</div>
              <div>GPU: {gpuInfo || 'Not available'}</div>
              <div>Backend: WebGPU</div>
            </div>
          )}
          {transcription && (
            <div className='mt-4'>
              <strong>Transcription:</strong>
              <p className='mt-2 p-4 bg-group-surface rounded-sm whitespace-pre-wrap'>{transcription}</p>
            </div>
          )}
        </div>
      ) : (
        <div>{!isModelLoading && !error && <div className='text-fg-muted'>Microphone is inactive</div>}</div>
      )}
    </div>
  );
};
