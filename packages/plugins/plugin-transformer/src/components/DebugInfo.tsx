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
        <div className='mb-4 text-red-600'>
          <strong>Error:</strong> {error}
        </div>
      )}
      {isModelLoading && (
        <div className='mb-4'>
          <div>Loading model...</div>
          <div className='text-sm text-gray-500'>This may take a few moments</div>
        </div>
      )}
      {stream ? (
        <div>
          <div className='mb-2 text-green-600'>
            <strong>Status:</strong> Microphone is active
            {debug && audioLevel && (
              <div className='mt-2 is-48 bs-5 bg-gray-200 rounded relative'>
                <div
                  className='bs-full bg-green-500 transition-all duration-100 rounded'
                  style={{ width: `${(audioLevel / 255) * 100}%` }}
                />
              </div>
            )}
          </div>
          {isTranscribing && <div className='mb-2 text-gray-500'>Processing audio...</div>}
          {debug && (
            <div className='mb-4 text-sm text-gray-500 space-y-1'>
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
              <p className='mt-2 p-4 bg-gray-100 rounded whitespace-pre-wrap'>{transcription}</p>
            </div>
          )}
        </div>
      ) : (
        <div>{!isModelLoading && !error && <div className='text-gray-500'>Microphone is inactive</div>}</div>
      )}
    </div>
  );
};
