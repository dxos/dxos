//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

export type AudioStreamConfig = {
  active?: boolean;
  debug?: boolean;
  onAudioData?: (audioData: Float32Array) => Promise<void>;
};

export type AudioStreamState = {
  stream: MediaStream | null;
  error: string | null;
  audioLevel: number;
};

export const useAudioStream = ({ active, debug, onAudioData }: AudioStreamConfig) => {
  const [state, setState] = useState<AudioStreamState>({
    stream: null,
    error: null,
    audioLevel: 0,
  });

  // TODO(burdon): Convert to class.
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(undefined);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isProcessingRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);

  // Stats for visualization.
  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
      setState((prev) => ({ ...prev, audioLevel: average }));
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, []);

  const cleanup = useCallback(() => {
    log('cleaning up audio resources');

    // Stop all tracks.
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      mediaStreamRef.current = null;
    }

    // Disconnect and cleanup audio nodes.
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    audioBufferRef.current = [];
    setState({
      stream: null,
      error: null,
      audioLevel: 0,
    });
  }, [debug]);

  useEffect(() => {
    let mounted = true;

    const startStream = async () => {
      try {
        if (active) {
          cleanup();
          log.info('initializing audio stream...');
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: 16_000,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });

          if (!mounted || !active) {
            stream.getTracks().forEach((track) => {
              track.stop();
              track.enabled = false;
            });
            return;
          }

          mediaStreamRef.current = stream;

          // Create AudioContext for proper audio format.
          const context = new AudioContext({ sampleRate: 16_000 });

          // Add the audio worklet module.
          await context.audioWorklet.addModule(
            URL.createObjectURL(
              new Blob(
                [
                  `class AudioProcessor extends AudioWorkletProcessor {
                    constructor() {
                      super();
                      this._buffer = [];
                      this._samplesProcessed = 0;
                    }

                    process(inputs, outputs) {
                      const input = inputs[0];
                      const channel = input[0];
                      
                      if (channel) {
                        this._buffer.push(new Float32Array(channel));
                        this._samplesProcessed += channel.length;

                        // Process every 2 seconds (32000 samples at 16kHz).
                        if (this._samplesProcessed >= 32000) {
                          const combinedLength = this._buffer.reduce((acc, curr) => acc + curr.length, 0);
                          const combinedAudio = new Float32Array(combinedLength);
                          let offset = 0;

                          for (const buffer of this._buffer) {
                            combinedAudio.set(buffer, offset);
                            offset += buffer.length;
                          }

                          this.port.postMessage({ type: 'audio-data', data: combinedAudio });
                          
                          // Reset buffer and counter.
                          this._buffer = [];
                          this._samplesProcessed = 0;
                        }
                      }
                      return true;
                    }
                  }

                  registerProcessor('audio-processor', AudioProcessor);`,
                ],
                { type: 'application/javascript' },
              ),
            ),
          );

          const source = context.createMediaStreamSource(stream);
          const analyser = context.createAnalyser();
          analyserRef.current = analyser;

          // Create and connect the audio worklet node.
          const workletNode = new AudioWorkletNode(context, 'audio-processor');
          workletNodeRef.current = workletNode;

          workletNode.port.onmessage = async (event) => {
            if (!mounted || !active) {
              return;
            }

            if (event.data.type === 'audio-data') {
              isProcessingRef.current = true;
              try {
                log('processing audio', {
                  sampleRate: context.sampleRate,
                  length: event.data.data.length,
                  min: Math.min(...event.data.data),
                  max: Math.max(...event.data.data),
                });

                await onAudioData?.(event.data.data);
              } catch (err) {
                if (mounted) {
                  setState((prev) => ({
                    ...prev,
                    error: 'Error processing audio: ' + (err as Error).message,
                  }));
                }
                log.error('audio processing error', { err });
              } finally {
                isProcessingRef.current = false;
              }
            }
          };

          // Connect the audio nodes.
          source.connect(analyser);
          analyser.connect(workletNode);
          workletNode.connect(context.destination);

          if (debug) {
            analyser.fftSize = 256;
            updateAudioLevel();
          }

          audioContextRef.current = context;
          if (mounted && active) {
            setState({
              stream,
              error: null,
              audioLevel: 0,
            });
          }
        }
      } catch (err) {
        if (mounted) {
          setState((prev) => ({
            ...prev,
            error: 'Error accessing microphone: ' + (err as Error).message,
            stream: null,
          }));
        }
        log.error('microphone error', { err });
        cleanup();
      }
    };

    void startStream();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [active, debug, onAudioData, updateAudioLevel, cleanup]);

  useEffect(() => {
    if (!active) {
      cleanup();
    }
  }, [active, cleanup]);

  return state;
};
