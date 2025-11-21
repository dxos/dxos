# WebLLM Database Exploration

This directory contains experimental code for using WebLLM with grammar-constrained generation to explore DXOS databases using Echo queries.

## Overview

The implementation demonstrates:
- **EBNF Grammar** for Echo query DSL to constrain LLM output
- **Database Exploration Agent** that iteratively queries a database
- **Query Sandbox** integration for validating generated queries
- **Mock components** for testing without GPU requirements

## Files

- `web-llm.browser.test.ts` - Test suite with WebGPU diagnostics and WebLLM integration

## Testing

### Mock Tests (Work Everywhere)

Mock tests demonstrate the full workflow without requiring WebLLM or GPU:

```bash
moon run echo-query:test -- src/experimental/web-llm.browser.test.ts
```

These tests use predefined queries and verify:
- ✅ Agent exploration loop
- ✅ Query sandbox evaluation
- ✅ Mock query execution

### WebGPU Diagnostics

The test suite includes WebGPU availability checks:

```bash
moon run echo-query:test -- src/experimental/web-llm.browser.test.ts
```

Expected results in headless browsers:
- ✅ `navigator.gpu` exists
- ❌ GPU adapter is `null` (no GPU in headless/CI environments)

### Real WebLLM Tests (Works on macOS!)

**✅ WORKING:** WebGPU is now enabled in headless Chromium with the new `--headless=new` mode!

Test results on macOS with Apple GPU:
- ✅ WebGPU adapter detected
- ✅ WebLLM model loads (~664MB)
- ✅ LLM generates valid Echo queries
- ✅ Database exploration succeeds

Run the integration test:
```bash
VITEST_DEBUG=1 moon run echo-query:test -- src/experimental/web-llm.browser.test.ts
```

**Note:** First run downloads the model (~1-2GB) to IndexedDB. Subsequent runs use the cached model.

To test WebLLM with real GPU:

1. **Integrate into Composer App**
   ```typescript
   import * as webllm from '@mlc-ai/web-llm';
   
   const engine = await webllm.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC');
   ```

2. **Run in real browser** with GPU support (Chrome 113+, Edge 113+)

3. **Open browser DevTools** to monitor:
   - Model download progress (1-2GB)
   - WebGPU initialization
   - Query generation

## Using WebLLM in Your Application

### 1. Add Dependency

```json
{
  "dependencies": {
    "@mlc-ai/web-llm": "^0.2.79"
  }
}
```

### 2. Initialize Engine

```typescript
import * as webllm from '@mlc-ai/web-llm';
import { QuerySandbox } from '@dxos/echo-query';

const engine = await webllm.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
  initProgressCallback: (report) => {
    console.log(report.text); // Shows download progress
  },
});
```

### 3. Generate Queries with Grammar Constraints

```typescript
const sandbox = new QuerySandbox();
await sandbox.open();

const response = await engine.chat.completions.create({
  messages: [
    { role: 'system', content: 'You are a database query agent...' },
    { role: 'user', content: 'Find all persons' },
  ],
  temperature: 0.7,
  max_tokens: 256,
  // Grammar constraint (requires WebLLM version with xgrammar support)
  response_format: {
    type: 'grammar',
    grammar: ECHO_QUERY_GRAMMAR,
  } as any,
});

const queryCode = response.choices[0].message.content;
const queryAST = sandbox.eval(queryCode);
```

### 4. Execute Query

```typescript
import { Client } from '@dxos/client';

const client = new Client();
await client.initialize();

const space = client.spaces.default;
const results = space.db.query(queryAST).run();
```

## Grammar-Constrained Generation

The `ECHO_QUERY_GRAMMAR` (defined in the test file) constrains the LLM to only generate valid Echo query expressions:

- `Query.type('typename')` - Query by type
- `Query.select(filter)` - Query with filter
- `Filter.and(...)`, `Filter.or(...)` - Combine filters
- Property predicates: `Filter.eq()`, `Filter.gt()`, `Filter.lt()`

## Limitations & Workarounds

### WebGPU Not Available

If WebGPU is not available:

1. **Use CPU-based alternatives:**
   - `@huggingface/transformers.js` (works in Node.js)
   - `node-llama-cpp` (native bindings)
   - Ollama (external server)

2. **Use API-based LLMs:**
   - OpenAI API
   - Anthropic Claude
   - Google Gemini

3. **Skip grammar constraints:**
   - Use prompt engineering instead
   - Post-process LLM output to extract queries
   - Validate with QuerySandbox

### Example: Non-GPU Alternative

```typescript
// Use OpenAI API instead of WebLLM
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'Generate Echo query...' },
    { role: 'user', content: context },
  ],
});

// Extract and validate query
const queryCode = extractQuery(response.choices[0].message.content);
const queryAST = sandbox.eval(queryCode);
```

## References

- [WebLLM Documentation](https://github.com/mlc-ai/web-llm)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [WebGPU Browser Support](https://webgpureport.org/)
- [Echo Query DSL](../query/query.ts)
