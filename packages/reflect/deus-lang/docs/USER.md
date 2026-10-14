hows unison different from effect-ts --- appart from obvious, js, vm, etc..

---

does unison compile to wasm?

---

what if you combine unison with a proof engine like lean to produce mathmetical proofs?

---

lets implement it.

name the language DEUS

- take best of everything: proofs, lean syntax, hash codebase, iris, specs, mdl
- create new package. keep docs with references to prior art
- CLI for codebase-magement and execution + interpretor + testing framework
- wasm compiler
- llm uses CLI directly to read terms and write patches
- use ucm's ideas about branching and naming
- keep decision log

work fully autonomously from now on

first goal: dogfooding the compiler/CLI/codebase so they are written in deus

---

keep a file where only what I say goes that, use that as golden standard. your decision log is separate file

---

- being able to define performance requirements in semi-formal way as part of mdl

---

mdl is extensible -- the mdl extensions are defined in the language

---

- i like the effects model for checked errors -- lets add it. we could have errors (checked, exepcted), defects (code is bugged), panics (kernel broken)

---

- make be able to compile to standalone binary

---

- proposal: we need to be able to separate graph data (the actual content-addressed defintiions) into subgraphs. so that it doesnt become one huge graph. lets have that be infered from definitoin IRIs? the authoerity part. it should be pretty coarse -- sepecific library, organization, project
- proposal: be able to represent requirements to extenral toolling kinda like nix -- if we ever need to depend on fetching binaries to do things. also have language to describe external registries: npm, crates, apt, etc...

---

proposals are ideas to solve things, you need to evaluate and choose the best approach, maybe there's a better pparoach

---

- proposal: store replication. could be just pushing to an r2 (our artifacts buckets is suitable). every push is a new file. graph compaction is needed (iternining, deduping, clearing old definitions). maybe sedimentary/subduction style compaction where concurent clients can do compaction locally and push overlappign blobs

---

- have commits/branching support -- we have to be able to know how codebase evolves -- what's UCM stance on this

---

- test with some simple lean-style formal proof
- better test: declaration, formal theorem about it, impl and proof -- for example a sorting algo

---

- syntax for deus so vscode can render it

---

- we should have layers for code-base defintions: spec, code, proofs, tests, artifacts, llm codegent, cache, test-results, etc...

---

- ability to represent docker containers in mdl

---

- observablity should be first class: structured logging, tracing, otel, metrics, stack traces -- agents love that -- each error must come with a ton of context so that agents can pinpoint bugs

---

- tests: prefer determinisctic tests: abilities are implemented as deterministic simulations: seeded rng, fs, etc... but sometimes its not possible: we might wanna test against external systems: support both

---

- perf is important -- directly influences iteration speed -- invest in it

---

- can you keep a timeline for me in md file in docs -- I wanna see how this evolves -- record real wall time since last stage in each stage
