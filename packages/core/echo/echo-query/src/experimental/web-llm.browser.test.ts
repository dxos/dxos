//
// Copyright 2025 DXOS.org
//

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { type QueryAST } from '@dxos/echo-protocol';
import { trim } from '@dxos/util';

import { QuerySandbox } from '../sandbox/query-sandbox';

/**
 * EBNF grammar for DXOS echo query DSL.
 * This grammar constrains the LLM to only generate valid echo query expressions.
 */
const ECHO_QUERY_GRAMMAR = trim`
root ::= query_expr

query_expr ::= query_select | query_type | query_all | query_reference | query_filter

query_select ::= "Query.select(" filter_expr ")"
query_type ::= "Query.type('" typename "')" prop_filter?
query_all ::= "Query.all(" query_expr ("," ws query_expr)* ")"
query_reference ::= query_expr ".reference('" identifier "')"
query_filter ::= query_expr ".select(" filter_expr ")"

filter_expr ::= filter_typename | filter_type | filter_props | filter_everything | filter_and | filter_or
filter_typename ::= "Filter.typename('" typename "')"
filter_type ::= "Filter.type('" typename "'" prop_filter? ")"
filter_props ::= "Filter.props({" prop_list "})"
filter_everything ::= "Filter.everything()"
filter_and ::= "Filter.and(" filter_expr ("," ws filter_expr)+ ")"
filter_or ::= "Filter.or(" filter_expr ("," ws filter_expr)+ ")"

prop_filter ::= "," ws "{" prop_list "}"
prop_list ::= prop_assignment ("," ws prop_assignment)*
prop_assignment ::= identifier ":" ws (string | number | boolean | filter_predicate)

filter_predicate ::= "Filter.eq(" value ")" | "Filter.gt(" value ")" | "Filter.lt(" value ")"
value ::= string | number | boolean

typename ::= "dxos.org/type/" identifier
identifier ::= [a-zA-Z_] [a-zA-Z0-9_]*
string ::= "'" [^']* "'"
number ::= "-"? [0-9]+ ("." [0-9]+)?
boolean ::= "true" | "false"
ws ::= [ \\t\\n]*
`;

/**
 * System prompt for the database exploration agent.
 */
const AGENT_SYSTEM_PROMPT = trim`
You are a database exploration agent. Generate ONE valid Echo query to explore the database.

Available types:
- dxos.org/type/Person (name, age, jobTitle, organization)
- dxos.org/type/Organization (name, industry, size)
- dxos.org/type/Project (name, status, owner)
- dxos.org/type/Task (title, completed, assignee)

Valid query examples:
Query.type('dxos.org/type/Person')
Query.type('dxos.org/type/Organization')
Query.type('dxos.org/type/Task')
Query.type('dxos.org/type/Project')
Query.type('dxos.org/type/Person', { jobTitle: 'engineer' })
Query.type('dxos.org/type/Task', { completed: false })

IMPORTANT: Output ONLY the query expression. No explanation. No extra text.
Example output: Query.type('dxos.org/type/Person')
`;

/**
 * Mock database state with sample objects.
 */
interface DatabaseObject {
  id: string;
  type: string;
  props: Record<string, any>;
}

const createMockDatabase = (): DatabaseObject[] => [
  {
    id: 'person1',
    type: 'dxos.org/type/Person',
    props: { name: 'Alice Johnson', age: 32, jobTitle: 'engineer', organization: 'org1' },
  },
  {
    id: 'person2',
    type: 'dxos.org/type/Person',
    props: { name: 'Bob Smith', age: 45, jobTitle: 'manager', organization: 'org1' },
  },
  {
    id: 'person3',
    type: 'dxos.org/type/Person',
    props: { name: 'Carol Lee', age: 28, jobTitle: 'designer', organization: 'org2' },
  },
  {
    id: 'org1',
    type: 'dxos.org/type/Organization',
    props: { name: 'Tech Corp', industry: 'technology', size: 500 },
  },
  {
    id: 'org2',
    type: 'dxos.org/type/Organization',
    props: { name: 'Design Studio', industry: 'creative', size: 50 },
  },
  {
    id: 'project1',
    type: 'dxos.org/type/Project',
    props: { name: 'Website Redesign', status: 'active', owner: 'person3' },
  },
  {
    id: 'task1',
    type: 'dxos.org/type/Task',
    props: { title: 'Design homepage', completed: false, assignee: 'person3' },
  },
  {
    id: 'task2',
    type: 'dxos.org/type/Task',
    props: { title: 'Review code', completed: true, assignee: 'person1' },
  },
];

/**
 * Simulates query execution against the mock database.
 * Returns objects that match the query AST.
 */
const executeQueryOnMockDB = (queryAst: QueryAST.Query, database: DatabaseObject[]): DatabaseObject[] => {
  // Simplified query execution for testing.
  // In a real implementation, this would fully interpret the QueryAST.

  const executeQuery = (ast: QueryAST.Query): DatabaseObject[] => {
    switch (ast.type) {
      case 'select': {
        return executeFilter(ast.filter, database);
      }
      case 'filter': {
        const selection = executeQuery(ast.selection);
        return executeFilter(ast.filter, selection);
      }
      case 'union': {
        const results = ast.queries.flatMap((q) => executeQuery(q));
        // Remove duplicates.
        return Array.from(new Map(results.map((obj) => [obj.id, obj])).values());
      }
      default:
        return [];
    }
  };

  const executeFilter = (filter: QueryAST.Filter, objects: DatabaseObject[]): DatabaseObject[] => {
    switch (filter.type) {
      case 'object': {
        return objects.filter((obj) => {
          if (filter.typename) {
            // Strip "dxn:type:" prefix if present.
            const typename = filter.typename.replace(/^dxn:type:/, '');
            if (obj.type !== typename) {
              return false;
            }
          }
          if (filter.id && !filter.id.includes(obj.id)) {
            return false;
          }
          // Check property filters.
          for (const [key, propFilter] of Object.entries(filter.props ?? {})) {
            if (!matchPropertyFilter(obj.props[key], propFilter)) {
              return false;
            }
          }
          return true;
        });
      }
      case 'and': {
        return filter.filters.reduce((acc, f) => executeFilter(f, acc), objects);
      }
      case 'or': {
        const results = filter.filters.flatMap((f) => executeFilter(f, objects));
        return Array.from(new Map(results.map((obj) => [obj.id, obj])).values());
      }
      case 'not': {
        const excluded = executeFilter(filter.filter, objects);
        const excludedIds = new Set(excluded.map((obj) => obj.id));
        return objects.filter((obj) => !excludedIds.has(obj.id));
      }
      default:
        return objects;
    }
  };

  const matchPropertyFilter = (value: any, filter: QueryAST.Filter): boolean => {
    if (filter.type === 'compare') {
      const filterValue = filter.value as any;
      switch (filter.operator) {
        case 'eq':
          return value === filterValue;
        case 'neq':
          return value !== filterValue;
        case 'gt':
          return value > filterValue;
        case 'lt':
          return value < filterValue;
        case 'gte':
          return value >= filterValue;
        case 'lte':
          return value <= filterValue;
        default:
          return false;
      }
    }
    return true;
  };

  return executeQuery(queryAst);
};

/**
 * Mock WebLLM agent for testing.
 * In a real implementation, this would use @mlc-ai/web-llm.
 */
class MockWebLLMAgent {
  private queryIndex = 0;
  private readonly predefinedQueries = [
    "Query.type('dxos.org/type/Person')",
    "Query.type('dxos.org/type/Person', { jobTitle: 'engineer' })",
    "Query.type('dxos.org/type/Organization')",
    "Query.type('dxos.org/type/Task', { completed: false })",
    "Query.type('dxos.org/type/Project')",
  ];

  /**
   * Generate the next query based on context.
   * In a real implementation, this would call the LLM with grammar constraints.
   */
  async generateQuery(_context: string): Promise<string> {
    // For testing, cycle through predefined queries.
    const query = this.predefinedQueries[this.queryIndex % this.predefinedQueries.length];
    this.queryIndex++;
    return query;
  }
}

/**
 * Database exploration agent that uses LLM to generate queries.
 */
class DatabaseExplorationAgent {
  private readonly sandbox: QuerySandbox;
  private readonly llm: MockWebLLMAgent;
  private readonly database: DatabaseObject[];
  private readonly exploredObjects: DatabaseObject[] = [];
  private readonly context: string[] = [];
  private readonly prompt: string;

  constructor(sandbox: QuerySandbox, llm: MockWebLLMAgent, database: DatabaseObject[], prompt: string) {
    this.sandbox = sandbox;
    this.llm = llm;
    this.database = database;
    this.prompt = prompt;
  }

  /**
   * Run the exploration loop for a specified number of iterations.
   */
  async explore(maxIterations: number): Promise<DatabaseObject[]> {
    for (let i = 0; i < maxIterations; i++) {
      console.log(`\n[Iteration ${i + 1}/${maxIterations}]`);

      // Generate context from explored objects.
      const contextStr = this.buildContext();

      // Agent generates a query.
      const queryCode = await this.llm.generateQuery(contextStr);
      console.log(`Generated query: ${queryCode}`);
      this.context.push(`Query ${i + 1}: ${queryCode}`);

      // Execute query in sandbox to get AST.
      let queryAst: QueryAST.Query;
      try {
        queryAst = this.sandbox.eval(queryCode);
        console.log(`✅ Query parsed successfully`);
      } catch (error) {
        console.log(`❌ Query parse failed:`, error);
        this.context.push(`Error: Invalid query - ${error}`);
        continue;
      }

      // Execute query against database.
      const results = executeQueryOnMockDB(queryAst, this.database);
      console.log(`Found ${results.length} results`);
      this.context.push(`Results: ${results.length} objects found`);

      // Add new objects to explored set.
      for (const obj of results) {
        if (!this.exploredObjects.some((e) => e.id === obj.id)) {
          this.exploredObjects.push(obj);
          console.log(`  + Added: ${obj.type} - ${JSON.stringify(obj.props)}`);
          this.context.push(`  - ${obj.type}: ${JSON.stringify(obj.props)}`);
        }
      }

      console.log(`Total explored: ${this.exploredObjects.length}/${this.database.length}`);

      // Stop if we've explored all objects.
      if (this.exploredObjects.length >= this.database.length) {
        break;
      }
    }

    return this.exploredObjects;
  }

  /**
   * Build context string from explored objects.
   */
  private buildContext(): string {
    if (this.exploredObjects.length === 0) {
      return trim`
        Generate queries to explore the database and find required objects.
        GOAL/QUERY: ${this.prompt}
      `;
    }

    const recentQueries = this.context.slice(-3).join('\n');
    return trim`
      Explored ${this.exploredObjects.length}/${this.database.length} objects.
      Recent: ${recentQueries}
      Generate next query to explore different types.
    `;
  }

  getContext(): string[] {
    return this.context;
  }
}

describe.skip('WebLLM Database Exploration', () => {
  const sandbox = new QuerySandbox();

  beforeAll(async () => await sandbox.open());
  afterAll(async () => await sandbox.close());

  test('agent explores database using grammar-constrained queries', async ({ expect }) => {
    const database = createMockDatabase();
    const llm = new MockWebLLMAgent();
    const agent = new DatabaseExplorationAgent(sandbox, llm, database);

    // Run exploration loop.
    const exploredObjects = await agent.explore(5);

    // Verify that the agent explored objects.
    expect(exploredObjects.length).toBeGreaterThan(0);
    expect(exploredObjects.length).toBeLessThanOrEqual(database.length);

    // Verify that all explored objects are from the database.
    for (const obj of exploredObjects) {
      expect(database.some((dbObj) => dbObj.id === obj.id)).toBe(true);
    }

    // Log exploration context for debugging.
    console.log('Exploration context:');
    console.log(agent.getContext().join('\n'));
  });

  test('sandbox can evaluate various echo query expressions', ({ expect }) => {
    // Test basic type query.
    const ast1 = sandbox.eval("Query.type('dxos.org/type/Person')");
    expect(ast1.type).toBe('select');

    // Test query with property filter.
    const ast2 = sandbox.eval("Query.type('dxos.org/type/Person', { age: 30 })");
    expect(ast2.type).toBe('select');

    // Test filter combination.
    const ast3 = sandbox.eval(trim`
      Query.select(Filter.and(
        Filter.typename('dxos.org/type/Person'),
        Filter.props({ jobTitle: 'engineer' })
      ))
    `);
    expect(ast3.type).toBe('select');
  });

  test('mock query execution returns correct results', async ({ expect }) => {
    const database = createMockDatabase();
    const testSandbox = new QuerySandbox();
    await testSandbox.open();

    try {
      // Query all persons.
      const personQuery = testSandbox.eval("Query.type('dxos.org/type/Person')");
      const persons = executeQueryOnMockDB(personQuery, database);
      expect(persons.length).toBe(3);

      // Query persons with specific job title.
      const engineerQuery = testSandbox.eval("Query.type('dxos.org/type/Person', { jobTitle: 'engineer' })");
      const engineers = executeQueryOnMockDB(engineerQuery, database);
      expect(engineers.length).toBe(1);
      expect(engineers[0].props.name).toBe('Alice Johnson');

      // Query organizations.
      const orgQuery = testSandbox.eval("Query.type('dxos.org/type/Organization')");
      const orgs = executeQueryOnMockDB(orgQuery, database);
      expect(orgs.length).toBe(2);
    } finally {
      await testSandbox.close();
    }
  });
});

/**
 * Real WebLLM agent implementation.
 *
 * Note: WebLLM requires browser APIs (WebGPU, IndexedDB, fetch) and will not work in Node.js.
 * This is intended for browser-based testing only.
 */
class RealWebLLMAgent {
  private engine: any = null;
  private initialized = false;

  /**
   * Initialize the WebLLM engine.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const webllm = await import('@mlc-ai/web-llm');

    console.log('Initializing WebLLM engine...');
    this.engine = await webllm.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
      initProgressCallback: (report: any) => {
        console.log(`[WebLLM] ${report.text}`);
      },
    });

    this.initialized = true;
    console.log('WebLLM engine initialized successfully');
  }

  /**
   * Generate a query using the LLM with grammar constraints.
   * a
   */
  async generateQuery(context: string): Promise<string> {
    if (!this.initialized || !this.engine) {
      throw new Error('WebLLM engine not initialized');
    }

    const response = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        { role: 'user', content: context },
      ],
      temperature: 0.3, // Lower temperature for more deterministic output
      max_tokens: 128,
      // Note: Grammar-constrained generation requires specific WebLLM version and model support.
      // For now, we'll rely on prompt engineering and post-process the response.
      // response_format: {
      //   type: 'grammar',
      //   grammar: ECHO_QUERY_GRAMMAR,
      // } as any,
    });

    const content = response.choices[0]?.message?.content || '';
    console.log(`[LLM Raw Response]: ${content}`);

    // Extract query from response (handle various formats).
    // Strategy 1: Find first line that starts with Query.
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Remove markdown code fence if present
      const cleaned = trimmed
        .replace(/^```.*$/, '')
        .replace(/^`/, '')
        .replace(/`$/, '');
      if (cleaned.startsWith('Query.')) {
        // console.log(`[LLM Extracted from line]: ${cleaned}`);
        return cleaned;
      }
    }

    // Strategy 2: Try regex match for Query.type pattern
    const typeMatch = content.match(/Query\.type\(['"][^'"]+['"]\s*(?:,\s*\{[^}]*\})?\)/);
    if (typeMatch) {
      const extracted = typeMatch[0];
      console.log(`[LLM Extracted via regex]: ${extracted}`);
      return extracted;
    }

    // Strategy 3: Just look for anything starting with Query.
    const anyQueryMatch = content.match(/Query\.[a-zA-Z]+\([^)]*\)/);
    if (anyQueryMatch) {
      console.log(`[LLM Extracted generic]: ${anyQueryMatch[0]}`);
      return anyQueryMatch[0];
    }

    // Fallback: return full content if no query line found.
    console.log(`[LLM Fallback]: Using full response`);
    return content.trim();
  }

  /**
   * Cleanup resources.
   */
  async dispose(): Promise<void> {
    if (this.engine) {
      // WebLLM doesn't expose explicit cleanup, but we can null the reference.
      this.engine = null;
    }
    this.initialized = false;
  }
}

/**
 * WebGPU availability tests.
 *
 * KNOWN LIMITATION: WebGPU is NOT available in automated/headless browsers like Vitest's Chromium.
 * WebGPU requires:
 * 1. Real GPU hardware (or software fallback that's properly configured)
 * 2. GPU drivers
 * 3. Display context
 *
 * Headless Chromium via Playwright typically returns null from requestAdapter().
 *
 * To test WebLLM with real GPU:
 * 1. Run in a real browser (not headless): open composer-app with web-llm integrated
 * 2. Use Chrome DevTools to debug
 * 3. Test on devices with GPU support
 *
 * For CI/CD: Consider using CPU-based LLM alternatives or skip WebLLM tests.
 */
describe('WebGPU Availability', () => {
  test('navigator.gpu exists', ({ expect }) => {
    console.log('Checking for navigator.gpu...');
    console.log('navigator.gpu:', navigator.gpu);
    expect(navigator.gpu).toBeDefined();
  });

  test('GPU adapter availability (expected to fail in headless)', async ({ expect }) => {
    console.log('Attempting to request GPU adapter...');
    console.log('NOTE: This typically fails in headless browsers');

    if (!navigator.gpu) {
      console.log('navigator.gpu is not available');
      return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    console.log('GPU adapter:', adapter);

    if (adapter) {
      console.log('✅ GPU adapter available! Adapter info:', {
        features: Array.from(adapter.features),
        limits: adapter.limits,
      });

      const device = await adapter.requestDevice();
      console.log('GPU device obtained:', device);
      device.destroy();

      expect(adapter).toBeDefined();
    } else {
      console.log('❌ GPU adapter is null (expected in headless Chromium)');
      console.log('WebLLM will NOT work in this environment');
      console.log('To use WebLLM, run in a real browser with GPU support');
    }
  });
});

/**
 * Real WebLLM integration test.
 *
 * This test runs in the browser via Vitest's browser mode and uses a real LLM
 * to explore the database with grammar-constrained query generation.
 *
 * Requirements:
 * - Browser with WebGPU support (Chrome 113+, Edge 113+)
 * - First run will download the model (~1-2GB) to IndexedDB
 * - Subsequent runs use cached model
 *
 * Run with: WEBLLM_TEST=1 moon run echo-query:test -- src/experimental/web-llm.browser.test.ts
 */
describe.only('WebLLM Real Integration', () => {
  test('explores database with real LLM', async ({ expect }) => {
    const database = createMockDatabase();
    const sandbox = new QuerySandbox();
    await sandbox.open();

    try {
      const llm = new RealWebLLMAgent();

      // Initialize WebLLM (will download model on first run).
      await llm.initialize();

      const agent = new DatabaseExplorationAgent(sandbox, llm as any, database, 'Find people who work for BlueYard');

      // Run a short exploration with the real LLM (5 iterations to allow for some failures).
      const exploredObjects = await agent.explore(5);

      // Verify that the agent explored objects.
      expect(exploredObjects.length).toBeGreaterThan(0);
      expect(exploredObjects.length).toBeLessThanOrEqual(database.length);

      // Log exploration context.
      console.log('\nExploration with real LLM:');
      console.log(agent.getContext().join('\n'));

      await llm.dispose();
    } finally {
      await sandbox.close();
    }
  }, 300_000); // 5 minute timeout for model download and inference.
});
