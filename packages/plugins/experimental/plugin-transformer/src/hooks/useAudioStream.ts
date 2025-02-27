//
// Copyright 2025 DXOS.org
//

import { useState, useRef, useEffect, useCallback } from 'react';

import { log } from '@dxos/log';

export type AudioStreamConfig = {
  active: boolean;
  debug?: boolean;
  onAudioData: (audioData: Float32Array) => Promise<void>;
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Audio visualization
  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average level
      const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
      setState((prev) => ({ ...prev, audioLevel: average }));

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, []);

  useEffect(() => {
    let audioContext: AudioContext | null = null;

    const startStream = async () => {
      try {
        if (active) {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: 16000,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });

          // Create AudioContext for proper audio format
          audioContext = new AudioContext({ sampleRate: 16000 });
          const source = audioContext.createMediaStreamSource(mediaStream);

          // Create a script processor to handle raw audio data
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          const analyser = audioContext.createAnalyser();

          source.connect(analyser);
          analyser.connect(processor);

          // Buffer to accumulate audio data
          let audioBuffer: Float32Array[] = [];
          let isProcessing = false;

          processor.onaudioprocess = async (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            audioBuffer.push(new Float32Array(inputData));

            // Process every 2 seconds (32000 samples at 16kHz)
            if (audioBuffer.length * 4096 >= 32000 && !isProcessing) {
              isProcessing = true;

              try {
                // Combine audio chunks
                const combinedLength = audioBuffer.reduce((acc, curr) => acc + curr.length, 0);
                const combinedAudio = new Float32Array(combinedLength);
                let offset = 0;

                for (const buffer of audioBuffer) {
                  combinedAudio.set(buffer, offset);
                  offset += buffer.length;
                }

                if (debug) {
                  log.info('processing audio', {
                    sampleRate: audioContext?.sampleRate,
                    length: combinedAudio.length,
                    min: Math.min(...combinedAudio),
                    max: Math.max(...combinedAudio),
                  });
                }

                await onAudioData(combinedAudio);

                // Clear the buffer after processing
                audioBuffer = [];
              } catch (err) {
                setState((prev) => ({
                  ...prev,
                  error: 'Error processing audio: ' + (err as Error).message,
                }));
                log.error('audio processing error', { err });
              } finally {
                isProcessing = false;
              }
            }
          };

          // Connect the processor to the destination to start processing
          processor.connect(audioContext.destination);

          if (debug) {
            analyserRef.current = analyser;
            analyserRef.current.fftSize = 256;
            updateAudioLevel();
          }

          audioContextRef.current = audioContext;
          setState({
            stream: mediaStream,
            error: null,
            audioLevel: 0,
          });
        }
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: 'Error accessing microphone: ' + (err as Error).message,
          stream: null,
        }));
        log.error('microphone error', { err });
      }
    };

    void startStream();

    return () => {
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContext) {
        void audioContext.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setState({
        stream: null,
        error: null,
        audioLevel: 0,
      });
    };
  }, [active, debug, onAudioData, updateAudioLevel]);

  return state;
};
