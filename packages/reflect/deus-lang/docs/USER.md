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
