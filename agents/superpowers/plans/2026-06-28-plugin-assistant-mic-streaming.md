# Plugin-Assistant Mic + Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled mic button in `plugin-assistant`'s `ChatActions` with the new `MicButton` + `MicSettings` components wired to `TranscriptionCapabilities`, and replace the `useVoiceInput` callback approach in `ChatPrompt` with word-by-word streaming via `PendingTextStreamer` + the `pendingText` CodeMirror extension.

**Architecture:** `ChatActions` gains a `docId` prop and becomes responsible for capability wiring (recording session atom + settings atom + device enumeration) — mirroring what `plugin-transcription/Mic` does for markdown toolbars. `ChatPrompt` drops `useVoiceInput` and gains a `useChatVoiceInput(docId, editorRef)` hook that manages `PendingTextStreamer` lifecycle and drives the `pendingText` CodeMirror state field directly into the chat editor view.

**Tech Stack:** React, `@dxos/react-ui` (`MicButton`, `MicSettings`-compatible dropdown), `@dxos/app-framework` (`useAtomCapabilityState`), `@dxos/plugin-transcription` (`TranscriptionCapabilities`, `useTranscriber`, `useAudioTrack`), `@dxos/ui-editor` (`pendingText`, `PendingTextStreamer`, `editorPendingTextSink`, `cancelPendingText`, `pendingTextState`), `@dxos/react-ui-chat` (`ChatEditor`).

---

## File Map

| File                                                                               | Action | What changes                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatActions.tsx`      | Modify | Replace `IconButton` mic with `MicButton` + settings dropdown; add `docId` prop; add capability wiring                                                                   |
| `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx`       | Modify | Remove `useVoiceInput`, `recordingState`, `record-start`/`record-stop` events; add `useChatVoiceInput`; pass `docId` to `ChatActions`; add `pendingText()` to extensions |
| `packages/plugins/plugin-assistant/src/components/ChatPrompt/useChatVoiceInput.ts` | Create | Hook: reads capabilities, manages `PendingTextStreamer` + `useTranscriber` lifecycle                                                                                     |

---

### Task 1: Replace mic `IconButton` in `ChatActions` with `MicButton` + settings

**Files:**

- Modify: `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatActions.tsx`

Context: `ChatActions` currently uses a raw `IconButton` with `onMouseDown`/`onMouseUp`/`onTouchStart`/`onTouchEnd` events and dispatches `record-start`/`record-stop` `ChatEvent`s upward. We replace this entirely with `MicButton` (from `@dxos/react-ui`) wired to `TranscriptionCapabilities` and a settings dropdown.

The `MicButton` API:

```tsx
<MicButton
  iconOnly
  variant='ghost'
  label={recordLabel}
  recording={recording}
  mode={recordMode} // 'toggle' | 'hold'
  onToggle={handleToggle} // used when mode === 'toggle'
  onPressStart={handlePressStart} // used when mode === 'hold'
  onPressEnd={handlePressEnd} // used when mode === 'hold'
/>
```

The settings dropdown is copied from `plugin-transcription/src/components/Mic/MicSettings.tsx` — an identical presentational component is NOT created; instead inline the settings as a `DropdownMenu` in `ChatActions` (same structure, same i18n keys from `meta.profile.key` which resolves to `'dxos.org/plugin/assistant'`).

Wait — `MicSettings` uses translation keys from `plugin-transcription`'s meta. Since we don't want a cross-plugin i18n dependency, inline the dropdown with hardcoded labels or use the assistant plugin's own translation namespace. Check what translations already exist in `plugin-assistant`.

- [ ] **Step 1.1: Check assistant translations**

```bash
find packages/plugins/plugin-assistant/src -name "*.json" | xargs grep -l "microphone\|record\|mic" 2>/dev/null
```

- [ ] **Step 1.2: Check existing i18n keys**

```bash
cat packages/plugins/plugin-assistant/src/translations.ts 2>/dev/null || \
  find packages/plugins/plugin-assistant/src -name "translations*" | head -5
```

- [ ] **Step 1.3: Check TranscriptionCapabilities shape**

```bash
cat packages/plugins/plugin-transcription/src/types/TranscriptionCapabilities.ts
```

- [ ] **Step 1.4: Rewrite `ChatActions.tsx`**

Replace the file with:

```tsx
//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { DropdownMenu, Icon, IconButton, MicButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { TranscriptionCapabilities, type Settings } from '@dxos/plugin-transcription';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { type ChatEvent } from '../Chat/events';

type AudioInputDevice = { deviceId: string; label: string };

export type ChatActionsProps = ThemedClassName<
  PropsWithChildren<{
    /** Attendable id of the chat session; keys the recording session atom. */
    docId?: string;
    microphone?: boolean;
    processing?: boolean;
    debug?: boolean;
    onEvent?: (event: ChatEvent) => void;
  }>
>;

export const ChatActions = ({
  classNames,
  children,
  docId,
  microphone,
  processing,
  debug,
  onEvent,
}: ChatActionsProps) => {
  const { t } = useTranslation(meta.profile.key);

  const [session, setSession] = useAtomCapabilityState(TranscriptionCapabilities.RecordingSession);
  const [settings, setSettings] = useAtomCapabilityState(TranscriptionCapabilities.Settings);

  const recording = !!docId && !!session?.recording && session.id === docId;
  const recordMode: Settings.RecordMode = settings?.recordMode ?? 'toggle';
  const entityExtraction = settings?.entityExtraction !== false;
  const selectedDeviceId = settings?.audioDeviceId ?? '';

  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const all = await navigator.mediaDevices.enumerateDevices();
      if (cancelled) {
        return;
      }
      setDevices(
        all
          .filter((d) => d.kind === 'audioinput' && d.deviceId)
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` })),
      );
    };
    void refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener('devicechange', refresh);
    };
  }, []);

  const handleToggle = useCallback(() => {
    if (!docId) return;
    setSession((current) => (current?.recording && current.id === docId ? null : { id: docId, recording: true }));
  }, [setSession, docId]);

  const handlePressStart = useCallback(() => {
    if (!docId) return;
    setSession(() => ({ id: docId, recording: true }));
  }, [setSession, docId]);

  const handlePressEnd = useCallback(() => {
    setSession((current) => (current?.id === docId ? null : current));
  }, [setSession, docId]);

  const recordLabel = recording
    ? t('stop-recording.label')
    : recordMode === 'hold'
      ? t('hold-to-record.label')
      : t('start-recording.label');

  return (
    <div className={mx('flex items-center', classNames)}>
      {children}

      {microphone && docId && (
        <div className='flex items-center'>
          <MicButton
            iconOnly
            variant='ghost'
            label={recordLabel}
            recording={recording}
            mode={recordMode}
            onToggle={handleToggle}
            onPressStart={handlePressStart}
            onPressEnd={handlePressEnd}
            data-testid='assistant.record'
          />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <IconButton
                icon='ph--caret-down--regular'
                iconOnly
                label={t('recording-options.label')}
                variant='ghost'
                classNames='w-4'
                data-testid='assistant.record.options'
              />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content>
                <DropdownMenu.Viewport>
                  <DropdownMenu.GroupLabel>{t('record-mode.label')}</DropdownMenu.GroupLabel>
                  <DropdownMenu.Item
                    classNames='gap-2'
                    onSelect={() => setSettings((s) => ({ ...s, recordMode: 'toggle' }))}
                  >
                    <span className='grow truncate'>{t('record-mode.toggle.label')}</span>
                    {recordMode === 'toggle' && <Icon icon='ph--check--regular' size={4} />}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    classNames='gap-2'
                    onSelect={() => setSettings((s) => ({ ...s, recordMode: 'hold' }))}
                  >
                    <span className='grow truncate'>{t('record-mode.hold.label')}</span>
                    {recordMode === 'hold' && <Icon icon='ph--check--regular' size={4} />}
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator />

                  <DropdownMenu.GroupLabel>{t('audio-device.label')}</DropdownMenu.GroupLabel>
                  <DropdownMenu.Item
                    classNames='gap-2'
                    onSelect={() => setSettings((s) => ({ ...s, audioDeviceId: undefined }))}
                  >
                    <span className='grow truncate'>{t('audio-device.default.label')}</span>
                    {selectedDeviceId === '' && <Icon icon='ph--check--regular' size={4} />}
                  </DropdownMenu.Item>
                  {devices.map((device) => (
                    <DropdownMenu.Item
                      key={device.deviceId}
                      classNames='gap-2'
                      onSelect={() => setSettings((s) => ({ ...s, audioDeviceId: device.deviceId }))}
                    >
                      <span className='grow truncate'>{device.label}</span>
                      {selectedDeviceId === device.deviceId && <Icon icon='ph--check--regular' size={4} />}
                    </DropdownMenu.Item>
                  ))}

                  <DropdownMenu.Separator />

                  <DropdownMenu.CheckboxItem
                    checked={entityExtraction}
                    onCheckedChange={(value) => setSettings((s) => ({ ...s, entityExtraction: value }))}
                    classNames='gap-2'
                    data-testid='assistant.entity-extraction'
                  >
                    <span className='grow truncate'>{t('settings.entity-extraction.label')}</span>
                    <DropdownMenu.ItemIndicator asChild>
                      <Icon icon='ph--check--regular' size={4} />
                    </DropdownMenu.ItemIndicator>
                  </DropdownMenu.CheckboxItem>
                </DropdownMenu.Viewport>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      )}

      {debug && (
        <IconButton
          variant='ghost'
          icon='ph--wrench--regular'
          iconOnly
          label={t('debug.button')}
          onClick={() => onEvent?.({ type: 'toggle-debug' })}
        />
      )}

      <IconButton
        variant='ghost'
        icon='ph--x--regular'
        iconOnly
        label={t('cancel-processing.button')}
        onClick={() => onEvent?.({ type: 'cancel' })}
      />
    </div>
  );
};
```

> **Note on i18n keys**: The translation keys `stop-recording.label`, `hold-to-record.label`, `start-recording.label`, `recording-options.label`, `record-mode.label`, `record-mode.toggle.label`, `record-mode.hold.label`, `audio-device.label`, `audio-device.default.label`, `settings.entity-extraction.label` must exist in the assistant plugin's translation file. Step 1.5 below adds them.

- [ ] **Step 1.5: Add missing translation keys**

Find the assistant plugin translations file and add the new keys. The file is likely at `packages/plugins/plugin-assistant/src/translations.ts` or similar. Check first:

```bash
find packages/plugins/plugin-assistant/src -name "translations*" -o -name "*.en.json" | head -5
```

Then add alongside the existing `microphone.button` key:

```
'stop-recording.label': 'Stop recording',
'hold-to-record.label': 'Hold to record',
'start-recording.label': 'Start recording',
'recording-options.label': 'Recording options',
'record-mode.label': 'Record mode',
'record-mode.toggle.label': 'Toggle',
'record-mode.hold.label': 'Hold (push-to-talk)',
'audio-device.label': 'Microphone',
'audio-device.default.label': 'System default',
'settings.entity-extraction.label': 'Entity extraction',
```

- [ ] **Step 1.6: Build to catch type errors**

```bash
cd packages/plugins/plugin-assistant && moon run plugin-assistant:build 2>&1 | grep -v "DEPOT_TOKEN" | tail -30
```

Expected: build succeeds with no type errors.

- [ ] **Step 1.7: Commit**

```bash
git add packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatActions.tsx
git commit -m "feat(plugin-assistant): replace IconButton mic with MicButton + settings dropdown"
```

---

### Task 2: Create `useChatVoiceInput` hook with `PendingTextStreamer`

**Files:**

- Create: `packages/plugins/plugin-assistant/src/components/ChatPrompt/useChatVoiceInput.ts`

This hook mirrors the streaming setup in `plugin-transcription/src/capabilities/transcription-driver.tsx` but scoped to a single `ChatEditorController` ref instead of a map of editor views.

- [ ] **Step 2.1: Read `TranscriptionCapabilities` to understand atom types**

```bash
cat packages/plugins/plugin-transcription/src/types/TranscriptionCapabilities.ts
```

- [ ] **Step 2.2: Read `useTranscriber` signature**

```bash
cat packages/plugins/plugin-transcription/src/hooks/useTranscriber.ts
```

- [ ] **Step 2.3: Create `useChatVoiceInput.ts`**

```tsx
//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { useTranscriber, useAudioTrack, TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { type ChatEditorController } from '@dxos/react-ui-chat';
import { PendingTextStreamer, cancelPendingText, editorPendingTextSink, pendingTextState } from '@dxos/ui-editor';

const RECORDER_INTERVAL_MS = 200;

/**
 * Manages voice input for the chat prompt via PendingTextStreamer.
 * Reads TranscriptionCapabilities to determine active recording session and settings.
 * When the session for `docId` becomes active, creates a PendingTextStreamer bound to the
 * ChatEditorController's live EditorView and drives word-by-word text insertion.
 */
export const useChatVoiceInput = (docId: string, editorRef: React.RefObject<ChatEditorController | null>) => {
  const [session] = useAtomCapabilityState(TranscriptionCapabilities.RecordingSession);
  const [settings] = useAtomCapabilityState(TranscriptionCapabilities.Settings);

  const active = !!session?.recording && session.id === docId;

  const streamerRef = useRef<PendingTextStreamer | null>(null);

  // Start/stop streamer when active changes.
  useEffect(() => {
    if (!active) {
      return;
    }
    const view = editorRef.current?.view;
    if (!view) {
      return;
    }

    const streamer = new PendingTextStreamer(editorPendingTextSink(view), {
      mode: settings?.streamMode ?? 'word',
      wordIntervalMs: settings?.wordIntervalMs ?? 80,
    });
    streamer.start({ anchor: view.state.selection.main.head, placeholder: 'Recording…' });
    streamerRef.current = streamer;

    return () => {
      streamer.dispose();
      streamerRef.current = null;
      // Drop the placeholder if nothing was transcribed.
      const currentView = editorRef.current?.view;
      if (currentView) {
        const pending = currentView.state.field(pendingTextState, false);
        if (pending && pending.final.length === 0) {
          currentView.dispatch({ effects: cancelPendingText.of() });
        }
      }
    };
  }, [active, settings?.streamMode, settings?.wordIntervalMs]);

  const transcriberConfig = useMemo(
    () => ({
      transcribeAfterChunksAmount: Math.max(
        1,
        Math.round((settings?.transcribeAfterMs ?? 4000) / RECORDER_INTERVAL_MS),
      ),
    }),
    [settings?.transcribeAfterMs],
  );

  const recorderConfig = useMemo(() => ({ interval: RECORDER_INTERVAL_MS }), []);

  const track = useAudioTrack(active);

  const handleSegments = useCallback(async (segments: { text: string }[]) => {
    const text = segments
      .map((s) => s.text)
      .join(' ')
      .trim();
    if (text.length > 0 && streamerRef.current) {
      streamerRef.current.push(text);
    }
  }, []);

  useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
    transcriberConfig,
    recorderConfig,
  });
};
```

> **Note on `handleSegments` type**: `useTranscriber`'s `onSegments` callback receives `ContentBlock.Transcript[]`. Import the type if TypeScript requires it — check what `useTranscriber` actually expects from `packages/plugins/plugin-transcription/src/hooks/useTranscriber.ts`.

- [ ] **Step 2.4: Build to check types**

```bash
moon run plugin-assistant:build 2>&1 | grep -v "DEPOT_TOKEN" | grep -E "error|Error" | head -20
```

Fix any type errors before proceeding. Common ones:

- `onSegments` type mismatch: adjust `handleSegments` signature to match `TranscriberProps['onSegments']`
- `useAtomCapabilityState` may return `[T | undefined, Dispatch]` — guard against `undefined`

- [ ] **Step 2.5: Commit**

```bash
git add packages/plugins/plugin-assistant/src/components/ChatPrompt/useChatVoiceInput.ts
git commit -m "feat(plugin-assistant): add useChatVoiceInput hook with PendingTextStreamer"
```

---

### Task 3: Wire `useChatVoiceInput` + `pendingText` extension into `ChatPrompt`

**Files:**

- Modify: `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx`

Changes:

1. Remove `useVoiceInput` import and usage
2. Remove `recordingState` state and `record-start`/`record-stop` event cases
3. Add `useChatVoiceInput(docId, editorRef)` call
4. Add `pendingText()` to the extensions passed to `ChatEditor`
5. Update `ChatActions` call: remove `recording={recording}` prop, add `docId={docId}`
6. The `docId` for the chat — the attendable/session key. Use `chat?.id` if available, or a stable fallback

- [ ] **Step 3.1: Check what `chat` looks like to get a stable id**

```bash
grep -n "Chat\b\|chat\.id\|chatId" packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx | head -10
grep -rn "interface Chat\b\|type Chat\b" packages/sdk/assistant-toolkit/src/ --include="*.ts" | head -5
```

- [ ] **Step 3.2: Update `ChatPrompt.tsx`**

Apply these targeted diffs:

**Remove** from imports:

```tsx
import { useVoiceInput } from '@dxos/plugin-transcription';
```

**Add** to imports:

```tsx
import { pendingText } from '@dxos/ui-editor';
import { useChatVoiceInput } from './useChatVoiceInput';
```

**Remove** state and event handling (lines ~69-97):

```tsx
const [recordingState, setRecordingState] = useState(false);
useEffect(() => {
  return event.on((ev) => {
    switch (ev.type) {
      // ...
      case 'record-start':
        setRecordingState(true);
        break;
      case 'record-stop':
        setRecordingState(false);
        break;
    }
  });
}, [event]);

// TODO(burdon): Configure capability in TranscriptionPlugin.
const { recording } = useVoiceInput({
  active: recordingState,
  onUpdate: (text) => {
    editorRef.current?.setText(text);
    editorRef.current?.focus();
  },
});
```

**Keep** the `update-prompt` case (it's still needed), simplify `useEffect` event handler to only handle `update-prompt`:

```tsx
useEffect(() => {
  return event.on((ev) => {
    if (ev.type === 'update-prompt' && !editorRef.current?.getText()?.length) {
      editorRef.current?.setText(ev.text);
      editorRef.current?.focus();
    }
  });
}, [event]);
```

**Add** after `editorRef`:

```tsx
const docId = chat?.id ?? 'chat-prompt';
useChatVoiceInput(docId, editorRef);
```

**Update** extensions to include `pendingText()`:

```tsx
const extensions = useChatKeymapExtensions({ event });
const allExtensions = useMemo(() => [extensions, pendingText()], [extensions]);
```

Add `useMemo` import from React if not already present.

**Update** `ChatEditor` to use `allExtensions`:

```tsx
<ChatEditor
  ref={editorRef}
  autoFocus
  lineWrapping
  classNames='col-span-2 pt-0.5'
  placeholder={placeholder ?? t('prompt.placeholder')}
  extensions={allExtensions}
  onSubmit={handleSubmit}
/>
```

**Update** `ChatActions` call — remove `recording` prop, add `docId`:

```tsx
  <ChatActions
    classNames='col-span-2'
    microphone={true}
    docId={docId}
    processing={streaming}
    onEvent={handleEvent}
  >
```

Also remove unused `useState` import if `recordingState` was the only state (check if `useState` is used elsewhere in the file).

- [ ] **Step 3.3: Check `chat` type for `.id`**

If `chat?.id` is not a string or is undefined, use a constant fallback like `processor.id ?? 'chat-prompt'`. Check:

```bash
grep -n "id\b" packages/sdk/assistant-toolkit/src/types.ts 2>/dev/null | head -10
```

- [ ] **Step 3.4: Build**

```bash
moon run plugin-assistant:build 2>&1 | grep -v "DEPOT_TOKEN" | grep -E "TS[0-9]+|error" | head -30
```

Fix any type errors. Common ones:

- `ChatActionsProps` still has `recording?: boolean` — the type was updated in Task 1, confirm it no longer has that prop
- `useMemo` not imported — add it to the React import
- `pendingText` import path — it's `@dxos/ui-editor`

- [ ] **Step 3.5: Lint**

```bash
moon run plugin-assistant:lint -- --fix 2>&1 | grep -v "DEPOT_TOKEN" | tail -20
```

- [ ] **Step 3.6: Commit**

```bash
git add packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx
git commit -m "feat(plugin-assistant): replace useVoiceInput with PendingTextStreamer streaming via pendingText extension"
```

---

### Task 4: Add `record-start`/`record-stop` removal from `ChatEvent` type

**Files:**

- Modify: `packages/plugins/plugin-assistant/src/components/Chat/events.ts`

Now that `ChatActions` no longer emits `record-start`/`record-stop`, these event types are dead. Remove them from the `ChatEvent` union to keep the type surface clean.

- [ ] **Step 4.1: Check the events file**

```bash
cat packages/plugins/plugin-assistant/src/components/Chat/events.ts
```

- [ ] **Step 4.2: Remove `record-start` and `record-stop` from `ChatEvent`**

Remove the two event type entries from the union. If they're used elsewhere in the codebase, update those call sites:

```bash
grep -rn "record-start\|record-stop" packages/plugins/plugin-assistant/src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 4.3: Build + lint**

```bash
moon run plugin-assistant:build 2>&1 | grep -v "DEPOT_TOKEN" | grep -E "error|Error" | head -20
moon run plugin-assistant:lint -- --fix 2>&1 | grep -v "DEPOT_TOKEN" | tail -10
```

- [ ] **Step 4.4: Commit**

```bash
git add packages/plugins/plugin-assistant/src/components/Chat/events.ts
git commit -m "refactor(plugin-assistant): remove record-start/stop events (handled via TranscriptionCapabilities)"
```

---

### Task 5: Final build + lint verification

- [ ] **Step 5.1: Full build**

```bash
moon run plugin-assistant:build 2>&1 | grep -v "DEPOT_TOKEN" | tail -20
```

Expected: exits 0, no type errors.

- [ ] **Step 5.2: Lint**

```bash
moon run plugin-assistant:lint -- --fix 2>&1 | grep -v "DEPOT_TOKEN" | tail -20
```

- [ ] **Step 5.3: Format**

```bash
npx oxfmt --write packages/plugins/plugin-assistant/src/components/ChatPrompt/
```

- [ ] **Step 5.4: Audit for casts**

```bash
git diff origin/main -- packages/plugins/plugin-assistant/ | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'
```

Expected: no output (no new casts introduced).

- [ ] **Step 5.5: Commit any formatting fixes**

```bash
git add -p packages/plugins/plugin-assistant/
git commit -m "style(plugin-assistant): formatting"
```
