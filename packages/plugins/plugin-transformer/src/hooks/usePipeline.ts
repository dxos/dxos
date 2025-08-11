//
// Copyright 2025 DXOS.org
//

import { type Pipeline, env, pipeline } from '@xenova/transformers';
import { useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

// Add WebGPU types.
declare global {
  interface Navigator {
    gpu?: {
      requestAdapter(): Promise<GPUAdapter | null>;
    };
  }

  interface GPUAdapter {
    requestAdapterInfo(): Promise<GPUAdapterInfo>;
  }

  interface GPUAdapterInfo {
    vendor: string;
    architecture: string;
    description: string;
  }
}

// Configure cache and runtime settings.
env.cacheDir = './.cache';
env.allowLocalModels = true;

// Configure ONNX runtime for WebGPU.
(env.backends.onnx as any).wasm.numThreads = 1;
(env.backends.onnx as any).provider = 'webgpu';
(env.backends.onnx as any).webgpu = {
  profilingMode: true,
};

export type PipelineConfig = {
  active?: boolean;
  debug?: boolean;
  model: string;
};

export type PipelineState = {
  gpuInfo: string;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
};

// TODO(burdon): Document external API.
export type TranscriptionOptions = {
  sampling_rate: number;
  chunk_length_s: number;
  stride_length_s: number;
  return_timestamps: boolean;
  language: string;
};

export const usePipeline = ({ active, model, debug }: PipelineConfig) => {
  const [state, setState] = useState<PipelineState>({
    gpuInfo: '',
    isLoaded: false,
    isLoading: false,
    error: null,
  });

  const pipelineRef = useRef<Pipeline | null>(null);

  // TODO(burdon): Factor out loading model. Separate tests.
  useEffect(() => {
    const loadModel = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Check WebGPU support.
        if (!navigator.gpu) {
          log.warn('WebGPU is not supported, falling back to CPU');
          setState((prev) => ({ ...prev, gpuInfo: 'WebGPU not supported (using CPU)' }));
        } else {
          try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
              throw new Error('No GPU adapter found');
            }

            // Try to get adapter info if available.
            try {
              const adapterInfo = await adapter.requestAdapterInfo();
              if (adapterInfo) {
                setState((prev) => ({
                  ...prev,
                  gpuInfo: `${adapterInfo.description || 'GPU'} (${adapterInfo.vendor || 'Unknown'})`,
                }));
              } else {
                setState((prev) => ({ ...prev, gpuInfo: 'GPU Available (details unknown)' }));
              }
            } catch (err) {
              log.warn('could not get GPU info', { err });
              setState((prev) => ({ ...prev, gpuInfo: 'GPU Available (details unavailable)' }));
            }
          } catch (err) {
            log.warn('WebGPU initialization failed', { err });
            setState((prev) => ({ ...prev, gpuInfo: 'GPU initialization failed (using CPU)' }));
          }
        }

        const pipe = await pipeline('automatic-speech-recognition', model, {
          quantized: true,
          progress_callback: (progress: any) => {
            if (debug) {
              log(`loading model: ${Math.round(progress.progress * 100)}%`);
            }
          },
        });

        pipelineRef.current = pipe;
        setState((prev) => ({ ...prev, isLoaded: true, isLoading: false }));
        log.info('model loaded successfully');
      } catch (err) {
        log.error('error loading model', { err });
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'error loading model: ' + (err as Error).message,
        }));
      }
    };

    if (active) {
      void loadModel();
    }

    return () => {
      pipelineRef.current = null;
      setState((prev) => ({ ...prev, isLoaded: false }));
    };
  }, [active, debug, model]);

  const transcribe = async (audioData: Float32Array, options: TranscriptionOptions) => {
    invariant(pipelineRef.current, 'pipeline not initialized');
    const result = await pipelineRef.current(audioData, options);
    return result;
  };

  return {
    ...state,
    transcribe,
  };
};
