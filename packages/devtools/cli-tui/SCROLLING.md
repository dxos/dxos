# Scrolling Implementation

This document explains how scrolling works in `@dxos/cli-tui`.

## Challenge

Ink (React for terminals) doesn't have built-in scrolling for Box components. The `overflow="hidden"` prop clips content but doesn't provide scroll functionality.

## Solution: Smart Message Selection

Instead of trying to scroll within a container, we intelligently select which messages to render based on:
1. Available viewport height
2. Estimated message heights (accounting for wrapping)
3. Always showing the most recent messages

## How It Works

### 1. Calculate Viewport Height

```typescript
const messageAreaHeight = useMemo(() => {
  const terminalHeight = stdout?.rows || 24;
  const inputHeight = 5;          // Input box height
  const statusBarHeight = 3;      // Status bar height
  const buffer = 2;               // Prevent status bar scroll-off
  return terminalHeight - inputHeight - statusBarHeight - buffer;
}, [stdout?.rows]);
```

### 2. Estimate Message Heights

For each message, we estimate how many lines it will take:

```typescript
// Calculate line wrapping
const terminalWidth = stdout?.columns || 80;
const availableWidth = terminalWidth - 4; // Account for padding

const contentParts = message.content.split("\n");
let wrappedLines = 0;
for (const part of contentParts) {
  wrappedLines += Math.max(1, Math.ceil(part.length / availableWidth));
}

// Add timestamp and margin
const estimatedLines = wrappedLines + 
  (message.role === "user" ? 1 : 0) + // timestamp
  1; // margin
```

### 3. Select Visible Messages

Work backwards from the most recent message:

```typescript
const visibleMessages = useMemo(() => {
  const result: typeof messages = [];
  let estimatedLines = 0;
  
  // Start from most recent (end of array)
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageLines = estimateMessageLines(message);
    
    // Check if this message fits
    if (estimatedLines + messageLines <= messageAreaHeight || result.length === 0) {
      result.unshift(message); // Add to front
      estimatedLines += messageLines;
    } else {
      break; // No more room
    }
  }
  
  return result;
}, [messages, messageAreaHeight, stdout?.columns]);
```

### 4. Show Hidden Message Indicator

```typescript
{visibleMessages.length < messages.length && (
  <Text dimColor>
    ... {messages.length - visibleMessages.length} earlier message
    {messages.length - visibleMessages.length !== 1 ? "s" : ""} hidden
  </Text>
)}
```

## Behavior

### Auto-scroll to Bottom
- New messages automatically appear (they're the most recent)
- During streaming, the updating message stays visible
- Users always see the latest content

### Message History
- Older messages scroll off the top as new ones arrive
- Indicator shows how many messages are hidden
- All messages remain in state (can be exported/saved)

### Dynamic Adjustment
- Viewport recalculates on terminal resize
- More/fewer messages shown based on terminal size
- Wrapping estimates adjust to terminal width

## Performance

### Why This Approach?

**Pros:**
- No complex scroll position management
- No need to render hidden messages
- Memoization prevents unnecessary recalculations
- Predictable performance (linear in visible messages only)

**Cons:**
- Can't scroll up to see old messages (future enhancement)
- Line estimation is approximate (might clip a message)

### Optimization

```typescript
// Memoize calculation
const visibleMessages = useMemo(() => {
  // ... calculation
}, [messages, messageAreaHeight, stdout?.columns]);
```

Only recalculates when:
- Messages change (new message, update during streaming)
- Terminal height changes (resize)
- Terminal width changes (affects wrapping)

## Future Enhancements

### 1. Manual Scrolling

Add keyboard controls to scroll up/down:

```typescript
useInput((input, key) => {
  if (key.upArrow) {
    setScrollOffset(prev => Math.max(0, prev - 1));
  }
  if (key.downArrow) {
    setScrollOffset(prev => Math.min(maxOffset, prev + 1));
  }
  if (key.pageUp) {
    setScrollOffset(prev => Math.max(0, prev - messageAreaHeight));
  }
  if (key.pageDown) {
    setScrollOffset(prev => Math.min(maxOffset, prev + messageAreaHeight));
  }
});
```

### 2. Virtual Scrolling

For very large message histories, implement virtual scrolling:
- Only render messages in/near viewport
- Maintain scroll position state
- Use placeholder heights for off-screen messages

### 3. Accurate Line Counting

Use Ink's rendering engine to measure actual rendered heights:
- Create hidden render to measure
- Cache measurements
- Update on terminal width change

### 4. Scroll Indicators

Visual feedback for scroll position:

```typescript
const scrollPercentage = Math.round((scrollOffset / maxOffset) * 100);

<Text dimColor>
  ↑ {hiddenAbove} messages ↑  [{scrollPercentage}%]
</Text>
```

## Testing

### Test Scrolling Behavior

1. **Fill viewport with messages:**
   ```bash
   pnpm tsx src/examples/demo.tsx
   # Type multiple commands until messages fill screen
   ```

2. **Long streaming response:**
   ```bash
   pnpm tsx src/examples/ollama-demo.tsx
   # Ask for a long response: "Write a 500 word essay about React"
   ```

3. **Terminal resize:**
   ```bash
   pnpm tsx src/examples/ollama-demo.tsx
   # Resize terminal while messages are visible
   # Verify message display adjusts
   ```

### Expected Behavior

- ✅ Most recent messages always visible
- ✅ Input stays at fixed position at bottom
- ✅ Status bar stays at fixed position at top
- ✅ Indicator shows when messages are hidden
- ✅ No flickering during scrolling
- ✅ Smooth streaming updates

### Known Issues

- Line estimation may be off for very long lines with special characters
- Multi-line messages with lots of newlines may cause overflow
- Terminal width changes mid-message may cause visual glitches

## Related Files

- `src/components/Chat.tsx` - Main scrolling logic
- `src/components/Message.tsx` - Message rendering
- `src/hooks/useMessages.ts` - Message state management
- `ANTI_FLICKER_GUIDE.md` - Performance optimizations

