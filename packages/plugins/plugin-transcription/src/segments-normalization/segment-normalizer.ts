//
// Copyright 2025 DXOS.org
//

//
// Copyright 2025 DXOS.org
//

import { DeferredTask } from '@dxos/async';
import { LifecycleState, Resource } from '@dxos/context';
import { ObjectId } from '@dxos/echo-schema';
import { type FunctionExecutor } from '@dxos/functions';
import { log } from '@dxos/log';
import { type DataType } from '@dxos/schema';

import { sentenceNormalization } from './function';

const SENTENCE_IS_COMPLETE_TIMEOUT = 3_000; // ms
const MAX_SEGMENTS_IN_SENTENCE = 10;

export type SegmentsNormalizerParams = {
  functionExecutor: FunctionExecutor;
  onSentence: (sentences: DataType.MessageBlock.Transcription[]) => void;
};

export class SegmentsNormalizer extends Resource {
  private readonly _functionExecutor: FunctionExecutor;
  private readonly _onSentence: SegmentsNormalizerParams['onSentence'];
  private _segmentsToProcess: (DataType.MessageBlock.Transcription & { id: string })[] = [];
  private _normalizationTask?: DeferredTask;

  constructor({ functionExecutor, onSentence }: SegmentsNormalizerParams) {
    super();
    this._functionExecutor = functionExecutor;
    this._onSentence = onSentence;
  }

  protected override async _open() {
    this._normalizationTask = new DeferredTask(this._ctx, () => this._processSegments());
  }

  public newSegments(segments: DataType.MessageBlock.Transcription[]) {
    if (this._lifecycleState !== LifecycleState.OPEN) {
      return;
    }

    const newSegments = segments.map((segment) => ({
      ...segment,
      id: ObjectId.random(),
    }));
    this._segmentsToProcess.push(...newSegments);
  }

  // Need to unpack strings from blocks from messages run them through the function and then pack them back into blocks into messages.
  private async _processSegments() {
    const currentSegments = this._segmentsToProcess;

    try {
      const response = await this._functionExecutor.invoke(sentenceNormalization, {
        segments: currentSegments,
      });
      const sentences = response.sentences;
      if (sentences.length > 1) {
        this._onSentence(sentences);
      }
    } catch {
      log.error('Failed to normalize segments', { segments: currentSegments });
      this._segmentsToProcess = this._segmentsToProcess.filter(
        (segment) => !currentSegments.some((s) => s.id === segment.id),
      );
    }
  }
}
