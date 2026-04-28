//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Icon, ScrollArea } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type InspectorStep, type InspectorStepType } from '#types';

export type ExecutionTimelineProps = {
  steps: InspectorStep[];
};

const stepConfig: Record<InspectorStepType, { icon: string; color?: string; label?: string }> = {
  'user-message': { icon: 'ph--paper-plane-right--regular', color: 'text-blue-500' },
  'assistant-message': { icon: 'ph--robot--regular', color: 'text-primary' },
  'tool-call': { icon: 'ph--lightning--regular', color: 'text-amber-500' },
  'tool-result': { icon: 'ph--check-circle--regular', color: 'text-green-500' },
  reasoning: { icon: 'ph--brain--regular', color: 'text-purple-400' },
  stats: { icon: 'ph--chart-bar--regular', color: 'text-description' },
  running: { icon: 'ph--spinner-gap--regular', color: 'text-primary' },
  'turn-start': { icon: 'ph--play--regular', color: 'text-description', label: 'Turn' },
  'turn-completed': { icon: 'ph--check--regular', color: 'text-green-500', label: 'Done' },
  'input-received': { icon: 'ph--arrow-square-down--regular', color: 'text-blue-400' },
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
};

/**
 * Real-time execution timeline for the Agent Inspector.
 */
export const ExecutionTimeline = ({ steps }: ExecutionTimelineProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom with smooth behavior.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [steps.length]);

  // Auto-expand the latest tool call.
  useEffect(() => {
    if (steps.length > 0) {
      const latest = steps[steps.length - 1];
      if ((latest.type === 'tool-call' || latest.type === 'tool-result') && hasDetail(latest)) {
        setExpandedSteps((prev) => new Set(prev).add(latest.id));
      }
    }
  }, [steps.length]);

  const toggleExpand = useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  if (steps.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center p-6 gap-2 text-description text-sm'>
        <Icon icon='ph--magnifying-glass--regular' size={6} classNames='opacity-20' />
        <span>Waiting for agent execution...</span>
        <span className='text-xs opacity-60'>Send a message or trigger a Slack response to see traces here.</span>
      </div>
    );
  }

  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport ref={scrollRef} className='max-h-full'>
        <div className='flex flex-col p-1.5'>
          {steps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              isLast={index === steps.length - 1}
              expanded={expandedSteps.has(step.id)}
              onToggle={() => toggleExpand(step.id)}
            />
          ))}
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

type StepItemProps = {
  step: InspectorStep;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
};

const hasDetail = (step: InspectorStep): boolean =>
  !!(step.toolInput || step.toolResult || step.content || step.error || step.tokens);

const StepItem = ({ step, isLast, expanded, onToggle }: StepItemProps) => {
  const isError = step.type === 'tool-result' && !!step.error;
  const config = stepConfig[step.type];
  const icon = isError ? 'ph--x-circle--regular' : config.icon;
  const expandable = hasDetail(step);
  const isTurnBoundary = step.type === 'turn-start' || step.type === 'turn-completed';

  return (
    <div className={mx(isTurnBoundary && step.type === 'turn-start' && 'mt-2')}>
      {/* Turn boundary divider. */}
      {step.type === 'turn-start' && (
        <div className='flex items-center gap-2 px-2 py-1'>
          <div className='flex-1 border-t border-separator' />
          <span className='text-[10px] text-description uppercase tracking-wider'>Agent Turn</span>
          <div className='flex-1 border-t border-separator' />
        </div>
      )}

      {/* Step row with timeline connector. */}
      {!isTurnBoundary && (
        <div className='flex'>
          {/* Timeline line. */}
          <div className='flex flex-col items-center w-6 shrink-0'>
            <div className={mx('w-px flex-1', isLast ? 'bg-transparent' : 'bg-separator')} />
          </div>

          <div className='flex-1 min-w-0'>
            <button
              className={mx(
                'flex items-center gap-1.5 w-full text-left px-1.5 py-0.5 rounded-sm text-xs',
                expandable && 'hover:bg-hoverSurface cursor-pointer',
                !expandable && 'cursor-default',
                step.pending && 'opacity-70',
                isLast && step.pending && 'animate-pulse',
              )}
              onClick={expandable ? onToggle : undefined}
              type='button'
            >
              <Icon
                icon={icon}
                size={3.5}
                classNames={mx(
                  isError ? 'text-error' : config.color,
                  step.pending && step.type === 'running' && 'animate-spin',
                )}
              />

              <span
                className={mx(
                  'flex-1 truncate',
                  isError && 'text-error',
                  step.type === 'reasoning' && 'italic text-description',
                )}
              >
                {step.type === 'tool-call' && step.toolName
                  ? step.toolName
                  : step.type === 'stats'
                    ? `${step.tokens?.input ?? 0}+${step.tokens?.output ?? 0} tokens · ${formatDuration(step.duration ?? 0)}`
                    : step.label}
              </span>

              <span className='text-[10px] text-description shrink-0 tabular-nums'>{formatTime(step.timestamp)}</span>

              {expandable && (
                <Icon
                  icon={expanded ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                  size={2.5}
                  classNames='text-description'
                />
              )}
            </button>

            {/* Expanded detail panel. */}
            {expanded && expandable && (
              <div className='ml-5 mr-1 my-0.5 p-2 rounded-sm bg-input/50 border border-separator text-[11px] font-mono overflow-x-auto'>
                {step.toolInput && (
                  <div className='mb-2'>
                    <div className='text-[10px] text-description uppercase tracking-wider mb-0.5'>Input</div>
                    <pre className='whitespace-pre-wrap break-all text-foreground'>{formatJson(step.toolInput)}</pre>
                  </div>
                )}
                {step.toolResult && (
                  <div className='mb-2'>
                    <div className='text-[10px] text-description uppercase tracking-wider mb-0.5'>Result</div>
                    <pre className='whitespace-pre-wrap break-all text-foreground'>
                      {step.toolResult.slice(0, 2000)}
                    </pre>
                  </div>
                )}
                {step.error && (
                  <div className='mb-2'>
                    <div className='text-[10px] text-error uppercase tracking-wider mb-0.5'>Error</div>
                    <pre className='whitespace-pre-wrap break-all text-error'>{step.error}</pre>
                  </div>
                )}
                {step.content && !step.toolInput && !step.toolResult && (
                  <pre className='whitespace-pre-wrap break-all'>{step.content.slice(0, 2000)}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats summary — inline compact. */}
      {step.type === 'stats' && step.tokens && (
        <div className='flex items-center gap-2 ml-6 px-1.5 py-0.5'>
          <div className='flex items-center gap-3 text-[10px] text-description'>
            <span className='tabular-nums'>{(step.tokens.input ?? 0) + (step.tokens.output ?? 0)} tokens</span>
            {step.duration !== undefined && <span className='tabular-nums'>{formatDuration(step.duration)}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

const formatJson = (jsonString: string): string => {
  try {
    return JSON.stringify(JSON.parse(jsonString), null, 2);
  } catch {
    return jsonString;
  }
};
