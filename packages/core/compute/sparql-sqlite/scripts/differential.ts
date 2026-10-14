//
// Copyright 2026 DXOS.org
//

import { Writer } from 'n3';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Parser } from 'sparqljs';

import { type Quad, type Row, type Term, XSD } from '../src/index.ts';
import { PROBES, QUERIES, generateCode, generateFacts } from '../src/testing/index.ts';
import {
  type ResultSet,
  type W3cEngine,
  compareOptions,
  compareResults,
  loadDataset,
  loadW3cTests,
  parseRdfFile,
  parseSrj,
  queryText,
  sqlEngine,
} from '../src/testing/w3c/index.ts';
import KNOWN from '../src/testing/w3c/known-failures.json' with { type: 'json' };
import { createComunicaEngine, createOxigraphEngine, toN3Quad } from './engines.ts';
import { generateQueries } from './query-gen.ts';

/**
 * Differential testing: runs one query corpus on sparql-sqlite, Oxigraph, Comunica and Apache Jena
 * ARQ and diffs the answers (result multisets, blank-node isomorphic, ordered under ORDER BY).
 *
 *   pnpm exec tsx scripts/differential.ts [--seed 1] [--count 300] [--no-w3c] [--no-jena]
 *
 * Corpus: the package's QUERIES and PROBES over the generated fact and code graphs, random queries
 * over facts and the schema.org vocabulary (a real ~17k-triple Turtle file), and every W3C
 * evaluation test this engine passes. Jena and schema.org are downloaded into `.cache/`.
 * Report: `.cache/differential.json`, Markdown summary on stdout.
 */

const CACHE = fileURLToPath(new URL('../.cache/', import.meta.url));
const JENA_VERSION = '5.5.0';
const JENA_URL = `https://archive.apache.org/dist/jena/binaries/apache-jena-${JENA_VERSION}.tar.gz`;
const SCHEMA_URL =
  'https://raw.githubusercontent.com/schemaorg/schemaorg/main/data/releases/29.0/schemaorg-current-https.ttl';
const TIMEOUT_MS = 20_000;
const NUMERIC = new Set(['integer', 'decimal', 'double', 'float', 'int', 'long'].map((name) => `${XSD}${name}`));

type Case = { id: string; dataset: string; sparql: string };
type Answer = { result?: ResultSet; error?: string; unsupported?: boolean };

const args = process.argv.slice(2);
const option = (name: string, fallback: number) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};

const download = (url: string, path: string) => {
  if (!existsSync(path)) {
    mkdirSync(CACHE, { recursive: true });
    // curl honours the proxy environment; Node's fetch does not.
    execFileSync('curl', ['-sSfL', '-o', path, url]);
  }
  return path;
};

const jenaHome = () => {
  const home = `${CACHE}apache-jena-${JENA_VERSION}`;
  if (!existsSync(home)) {
    const archive = download(JENA_URL, `${CACHE}jena.tgz`);
    execFileSync('tar', ['xzf', archive, '-C', CACHE]);
  }
  return home;
};

const toNQuads = (quads: readonly Quad[]): string => {
  const writer = new Writer({ format: 'N-Quads' });
  for (const quad of quads) {
    writer.addQuad(toN3Quad(quad));
  }
  let out = '';
  writer.end((_error, result: string) => {
    out = result;
  });
  return out;
};

/** Runs all cases through Jena in one JVM: one directory per case with its dataset and query. */
const runJena = (cases: Case[], datasets: Map<string, readonly Quad[]>): Map<string, Answer> => {
  const dir = `${CACHE}jena-cases/`;
  rmSync(dir, { recursive: true, force: true });
  const files = new Map<string, string>();
  for (const [name, quads] of datasets) {
    const file = `${CACHE}jena-data-${name.replace(/\W/g, '_')}.nq`;
    writeFileSync(file, toNQuads(quads));
    files.set(name, file);
  }
  cases.forEach((item, index) => {
    const caseDir = `${dir}${String(index).padStart(5, '0')}/`;
    mkdirSync(caseDir, { recursive: true });
    writeFileSync(`${caseDir}query.rq`, item.sparql);
    writeFileSync(`${caseDir}data.nq`, readFileSync(files.get(item.dataset) ?? ''));
  });
  execFileSync(
    'java',
    ['-cp', `${jenaHome()}/lib/*`, fileURLToPath(new URL('./jena/JenaBatch.java', import.meta.url)), 'cases', dir],
    {
      stdio: ['ignore', 'ignore', 'inherit'],
      maxBuffer: 1 << 26,
    },
  );
  const answers = new Map<string, Answer>();
  cases.forEach((item, index) => {
    const base = `${dir}${String(index).padStart(5, '0')}/query`;
    if (existsSync(`${base}.srj`)) {
      answers.set(item.id, { result: parseSrj(readFileSync(`${base}.srj`, 'utf8')) });
    } else if (existsSync(`${base}.nt`)) {
      const triples = parseRdfFile(`${base}.nt`, 'urn:x-base:').map(({ s, p, o }) => ({ s, p, o }));
      answers.set(item.id, { result: { kind: 'graph', triples } });
    } else {
      answers.set(item.id, { error: existsSync(`${base}.err`) ? readFileSync(`${base}.err`, 'utf8') : 'no output' });
    }
  });
  return answers;
};

const evaluate = async (engine: W3cEngine, sparql: string, dataset: readonly Quad[]): Promise<Answer> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<Answer>((resolve) => {
      timer = setTimeout(() => resolve({ error: 'timeout' }), TIMEOUT_MS);
    });
    return await Promise.race([engine.evaluate(sparql, dataset).then((result) => ({ result })), timeout]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), unsupported: engine.isUnsupported(error) };
  } finally {
    clearTimeout(timer);
  }
};

/** Numbers compare by value whatever their XSD type, so a typing difference is reported apart from a value one. */
const byValue = (result: ResultSet): ResultSet => {
  const normalize = (term: Term | undefined): Term | undefined =>
    term?.termType === 'Literal' && term.datatype && NUMERIC.has(term.datatype) && Number.isFinite(Number(term.value))
      ? { termType: 'Literal', value: String(Number(term.value)), datatype: `${XSD}double` }
      : term;
  const rows = (items: Row[]) =>
    items.map((row) => Object.fromEntries(Object.entries(row).map(([key, term]) => [key, normalize(term)])));
  switch (result.kind) {
    case 'bindings':
      return { ...result, rows: rows(result.rows) };
    case 'graph':
      return { ...result, triples: rows(result.triples) };
    default:
      return result;
  }
};

const main = async () => {
  const seed = option('seed', 1);
  const count = option('count', 300);
  const datasets = new Map<string, readonly Quad[]>([
    ['facts', generateFacts(0, 1000)],
    ['code', generateCode(0, 2000)],
    ['schemaorg', parseRdfFile(download(SCHEMA_URL, `${CACHE}schemaorg.ttl`), 'https://schema.org/')],
  ]);
  const cases: Case[] = [
    ...QUERIES.map((query) => ({
      id: query.id,
      dataset: query.id === 'Q7_path' ? 'code' : 'facts',
      sparql: query.sparql,
    })),
    ...PROBES.map((probe) => ({ id: `probe-${probe.id}`, dataset: 'facts', sparql: probe.sparql })),
    ...['facts', 'schemaorg'].flatMap((name) =>
      generateQueries(datasets.get(name) ?? [], seed, count).map((query) => ({
        id: `${name}/${query.id}`,
        dataset: name,
        sparql: query.sparql,
      })),
    ),
  ];
  if (!args.includes('--no-w3c')) {
    const known: Record<string, string> = KNOWN;
    for (const test of loadW3cTests()) {
      if (test.type === 'eval' && !test.skip && !known[test.id]) {
        const sparql = queryText(test);
        datasets.set(test.id, loadDataset(test, new Parser({ skipUngroupedVariableCheck: true }).parse(sparql)));
        cases.push({ id: `w3c/${test.id}`, dataset: test.id, sparql });
      }
    }
  }

  const engines = [sqlEngine, createOxigraphEngine(), createComunicaEngine()];
  const answers = new Map<string, Map<string, Answer>>(engines.map((engine) => [engine.name, new Map()]));
  for (const item of cases) {
    const dataset = datasets.get(item.dataset) ?? [];
    for (const engine of engines) {
      answers.get(engine.name)?.set(item.id, await evaluate(engine, item.sparql, dataset));
    }
  }
  const names = engines.map((engine) => engine.name);
  if (!args.includes('--no-jena')) {
    answers.set('jena', runJena(cases, datasets));
    names.push('jena');
  }

  type Verdict = 'agree' | 'unsupported' | 'ours-vs-consensus' | 'other-engine' | 'no-consensus' | 'numeric-type-only';
  const report: { id: string; verdict: Verdict; sparql: string; dissent: string[]; detail: Record<string, string> }[] =
    [];
  for (const item of cases) {
    const ours = answers.get('sparql-sqlite')?.get(item.id);
    const others = names.slice(1).map((name) => ({ name, answer: answers.get(name)?.get(item.id) }));
    const options = compareOptions(item.sparql);
    const detail: Record<string, string> = {};
    if (!ours?.result) {
      report.push({
        id: item.id,
        verdict: 'unsupported',
        sparql: item.sparql,
        dissent: [],
        detail: { ours: ours?.error ?? '' },
      });
      continue;
    }
    const oursResult = ours.result;
    const strict = new Map<string, boolean>();
    const loose = new Map<string, boolean>();
    for (const { name, answer } of others) {
      if (!answer?.result) {
        detail[name] = `error: ${answer?.error?.split('\n')[0] ?? ''}`;
        continue;
      }
      const diff = compareResults(answer.result, oursResult, options);
      strict.set(name, diff === undefined);
      loose.set(name, compareResults(byValue(answer.result), byValue(oursResult), options) === undefined);
      if (diff) {
        detail[name] = diff.slice(0, 2000);
      }
    }
    const ran = [...strict.keys()];
    const dissent = ran.filter((name) => !strict.get(name));
    let verdict: Verdict;
    if (dissent.length === 0) {
      verdict = 'agree';
    } else if (ran.every((name) => loose.get(name)) || dissent.every((name) => loose.get(name))) {
      verdict = 'numeric-type-only';
    } else if (dissent.length === ran.length && ran.length >= 2) {
      const [first, ...rest] = dissent;
      const firstResult = others.find(({ name }) => name === first)?.answer?.result;
      const consensus =
        firstResult &&
        rest.every((name) => {
          const result = others.find((other) => other.name === name)?.answer?.result;
          return result && compareResults(firstResult, result, options) === undefined;
        });
      verdict = consensus ? 'ours-vs-consensus' : 'no-consensus';
    } else {
      verdict = 'other-engine';
    }
    report.push({ id: item.id, verdict, sparql: item.sparql, dissent, detail });
  }

  const tally = new Map<string, number>();
  const dissentBy = new Map<string, number>();
  for (const entry of report) {
    tally.set(entry.verdict, (tally.get(entry.verdict) ?? 0) + 1);
    if (entry.verdict === 'other-engine') {
      for (const name of entry.dissent) {
        dissentBy.set(name, (dissentBy.get(name) ?? 0) + 1);
      }
    }
  }
  console.log(`cases: ${report.length} (seed ${seed}, ${count} generated per dataset)`);
  console.log('| verdict | cases |\n| --- | ---: |');
  for (const [verdict, value] of tally) {
    console.log(`| ${verdict} | ${value} |`);
  }
  console.log('\n| engine disagreeing alone or with a minority | cases |\n| --- | ---: |');
  for (const [name, value] of dissentBy) {
    console.log(`| ${name} | ${value} |`);
  }
  for (const entry of report.filter(
    (item) => item.verdict === 'ours-vs-consensus' || item.verdict === 'no-consensus',
  )) {
    console.log(`\n### ${entry.verdict}: ${entry.id}\n${entry.sparql}`);
  }
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(`${CACHE}differential.json`, JSON.stringify(report, null, 1));
  console.error(`details: ${CACHE}differential.json`);
};

void main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
