//
// Copyright 2026 DXOS.org
//

//! Interned terms and the fact views the rule engine evaluates against.

use std::cell::RefCell;

use oxigraph::model::Term;
use rustc_hash::{FxHashMap, FxHashSet};

pub type Id = u32;
pub type Triple = [Id; 3];

/// A per-run term dictionary. Ids are dense and only meaningful inside one engine run.
#[derive(Default)]
pub struct Dict {
    inner: RefCell<DictInner>,
}

#[derive(Default)]
struct DictInner {
    terms: Vec<Term>,
    ids: FxHashMap<Term, Id>,
}

impl Dict {
    pub fn intern(&self, term: &Term) -> Id {
        let mut inner = self.inner.borrow_mut();
        if let Some(id) = inner.ids.get(term) {
            return *id;
        }
        let id = Id::try_from(inner.terms.len()).expect("term dictionary overflow");
        inner.terms.push(term.clone());
        inner.ids.insert(term.clone(), id);
        id
    }

    pub fn lookup(&self, term: &Term) -> Option<Id> {
        self.inner.borrow().ids.get(term).copied()
    }

    pub fn term(&self, id: Id) -> Term {
        self.inner.borrow().terms[id as usize].clone()
    }

    /// The lexical form a string builtin operates on: a literal's value, an IRI's text.
    pub fn text(&self, id: Id) -> String {
        match &self.inner.borrow().terms[id as usize] {
            Term::Literal(literal) => literal.value().to_owned(),
            Term::NamedNode(node) => node.as_str().to_owned(),
            Term::BlankNode(node) => node.as_str().to_owned(),
        }
    }
}

/// A triple pattern over interned ids; `None` is a wildcard.
pub type Pattern = [Option<Id>; 3];

pub fn matches(pattern: &Pattern, triple: &Triple) -> bool {
    pattern
        .iter()
        .zip(triple)
        .all(|(slot, id)| slot.is_none_or(|value| value == *id))
}

/// Something triples can be looked up in. Scans may report a triple more than once (the same
/// triple asserted in two graphs); the engine has set semantics, so duplicates only cost time.
pub trait Facts {
    fn scan(&self, pattern: &Pattern, sink: &mut dyn FnMut(Triple));
    fn contains(&self, triple: &Triple) -> bool;
}

/// An in-memory triple set indexed on each position, for materialisations and deltas.
#[derive(Default, Clone)]
pub struct TripleSet {
    all: FxHashSet<Triple>,
    by: [FxHashMap<Id, FxHashSet<Triple>>; 3],
}

impl TripleSet {
    pub fn len(&self) -> usize {
        self.all.len()
    }

    pub fn is_empty(&self) -> bool {
        self.all.is_empty()
    }

    pub fn iter(&self) -> impl Iterator<Item = &Triple> {
        self.all.iter()
    }

    pub fn insert(&mut self, triple: Triple) -> bool {
        if !self.all.insert(triple) {
            return false;
        }
        for (position, index) in self.by.iter_mut().enumerate() {
            index.entry(triple[position]).or_default().insert(triple);
        }
        true
    }

    pub fn remove(&mut self, triple: &Triple) -> bool {
        if !self.all.remove(triple) {
            return false;
        }
        for (position, index) in self.by.iter_mut().enumerate() {
            if let Some(bucket) = index.get_mut(&triple[position]) {
                bucket.remove(triple);
                if bucket.is_empty() {
                    index.remove(&triple[position]);
                }
            }
        }
        true
    }
}

impl Facts for TripleSet {
    fn scan(&self, pattern: &Pattern, sink: &mut dyn FnMut(Triple)) {
        // The smallest bucket among the bound positions; a fully unbound pattern walks everything.
        let mut best: Option<&FxHashSet<Triple>> = None;
        for (position, slot) in pattern.iter().enumerate() {
            if let Some(id) = slot {
                match self.by[position].get(id) {
                    None => return,
                    Some(bucket) => {
                        if best.is_none_or(|current| bucket.len() < current.len()) {
                            best = Some(bucket);
                        }
                    }
                }
            }
        }
        for triple in best.unwrap_or(&self.all) {
            if matches(pattern, triple) {
                sink(*triple);
            }
        }
    }

    fn contains(&self, triple: &Triple) -> bool {
        self.all.contains(triple)
    }
}

/// The state before a change, given the state after it: `after − plus + minus`.
pub struct Before<'a> {
    pub after: &'a dyn Facts,
    pub plus: &'a TripleSet,
    pub minus: &'a TripleSet,
}

impl Facts for Before<'_> {
    fn scan(&self, pattern: &Pattern, sink: &mut dyn FnMut(Triple)) {
        self.after.scan(pattern, &mut |triple| {
            if !self.plus.contains(&triple) {
                sink(triple);
            }
        });
        self.minus.scan(pattern, sink);
    }

    fn contains(&self, triple: &Triple) -> bool {
        self.minus.contains(triple) || (!self.plus.contains(triple) && self.after.contains(triple))
    }
}

/// Premises plus a stratum's own conclusions, minus an optional excluded set (DRed's overdeleted facts).
pub struct Union<'a> {
    pub premises: &'a dyn Facts,
    pub derived: &'a TripleSet,
    pub excluded: Option<&'a TripleSet>,
}

impl Facts for Union<'_> {
    fn scan(&self, pattern: &Pattern, sink: &mut dyn FnMut(Triple)) {
        self.premises.scan(pattern, sink);
        match self.excluded {
            None => self.derived.scan(pattern, sink),
            Some(excluded) => self.derived.scan(pattern, &mut |triple| {
                if !excluded.contains(&triple) {
                    sink(triple);
                }
            }),
        }
    }

    fn contains(&self, triple: &Triple) -> bool {
        self.premises.contains(triple)
            || (self.derived.contains(triple)
                && self
                    .excluded
                    .is_none_or(|excluded| !excluded.contains(triple)))
    }
}
