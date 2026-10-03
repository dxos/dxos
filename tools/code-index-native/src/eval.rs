//
// Copyright 2026 DXOS.org
//

//! Semi-naive evaluation of one stratum, and its DRed maintenance under a change of premises.
//! Backward rules are proved on demand, inside whichever rule body calls them.

use std::cell::RefCell;
use std::rc::Rc;

use oxigraph::model::Term;
use regex::Regex;
use rustc_hash::{FxHashMap, FxHashSet};

use crate::facts::{Before, Dict, Facts, Id, Pattern, Triple, TripleSet, Union};
use crate::rules::{
    Atom, Compare, Group, Literal, Rule, RuleSet, Slot, integer_literal, string_literal,
};

type Binding = Vec<Option<Id>>;

/// How deep backward rules may call each other: a cycle in the data (an alias of an alias of
/// itself) would otherwise recurse forever, where EYE's own loop check would cut it.
const MAX_CALL_DEPTH: usize = 64;

/// Past this many matches an atom is simply large; counting further would cost a scan.
const ESTIMATE_CAP: usize = 10_000;

/// How much smaller than the written next atom another must be to go first.
const FAR_SMALLER: usize = 8;

thread_local! {
    /// Patterns a body builds (`("#" ?name "\\.(\\w+)$") string:concatenation ?pattern`), compiled once.
    static PATTERNS: RefCell<FxHashMap<String, Option<Regex>>> = RefCell::default();
}

/// A pattern built at run time; an invalid one matches nothing.
fn compiled(pattern: &str) -> Option<Regex> {
    PATTERNS.with(|patterns| {
        if let Some(regex) = patterns.borrow().get(pattern) {
            return regex.clone();
        }
        let regex = Regex::new(pattern).ok();
        patterns
            .borrow_mut()
            .insert(pattern.to_owned(), regex.clone());
        regex
    })
}

/// A slot's value under `binding`; a list is a value once all its members are.
fn resolve(rule: &Rule, dict: &Dict, slot: &Slot, binding: &Binding) -> Option<Id> {
    match slot {
        Slot::Const(id) => Some(*id),
        Slot::Var(var) => binding[*var],
        Slot::List(index) => {
            let items = rule.lists[*index]
                .iter()
                .map(|item| resolve(rule, dict, item, binding))
                .collect::<Option<Vec<_>>>()?;
            Some(dict.list(&items))
        }
    }
}

fn pattern(rule: &Rule, dict: &Dict, atom: &Atom, binding: &Binding) -> Pattern {
    [
        resolve(rule, dict, &atom.0[0], binding),
        resolve(rule, dict, &atom.0[1], binding),
        resolve(rule, dict, &atom.0[2], binding),
    ]
}

/// Binds the slot's unbound variables to `value`, pushing what it bound onto `trail`. False if the
/// value does not fit; the caller undoes a partial binding.
fn unify_slot(
    rule: &Rule,
    dict: &Dict,
    slot: &Slot,
    value: Id,
    binding: &mut Binding,
    trail: &mut Vec<usize>,
) -> bool {
    match slot {
        Slot::Const(id) => *id == value,
        Slot::Var(var) => match binding[*var] {
            Some(bound) => bound == value,
            None => {
                binding[*var] = Some(value);
                trail.push(*var);
                true
            }
        },
        Slot::List(index) => match dict.items(value) {
            Some(items) if items.len() == rule.lists[*index].len() => rule.lists[*index]
                .iter()
                .zip(items)
                .all(|(item, value)| unify_slot(rule, dict, item, value, binding, trail)),
            _ => false,
        },
    }
}

/// [`unify_slot`] for each position with a value; nothing is left bound if any does not fit.
fn unify_values(
    rule: &Rule,
    dict: &Dict,
    atom: &Atom,
    values: &[Option<Id>; 3],
    binding: &mut Binding,
    trail: &mut Vec<usize>,
) -> bool {
    let mark = trail.len();
    for (slot, value) in atom.0.iter().zip(values) {
        if let Some(value) = value
            && !unify_slot(rule, dict, slot, *value, binding, trail)
        {
            undo(binding, trail, mark);
            return false;
        }
    }
    true
}

fn unify(
    rule: &Rule,
    dict: &Dict,
    atom: &Atom,
    triple: &Triple,
    binding: &mut Binding,
    trail: &mut Vec<usize>,
) -> bool {
    unify_values(
        rule,
        dict,
        atom,
        &[Some(triple[0]), Some(triple[1]), Some(triple[2])],
        binding,
        trail,
    )
}

fn undo(binding: &mut Binding, trail: &mut Vec<usize>, mark: usize) {
    for var in trail.drain(mark..) {
        binding[var] = None;
    }
}

/// Pushes what a caller knows about one position into a backward rule's frame: a value, or for a
/// list the members that are bound. An unbound caller variable constrains nothing.
fn push(
    dict: &Dict,
    (caller, slot, binding): (&Rule, &Slot, &Binding),
    callee: &Rule,
    head: &Slot,
    frame: &mut Binding,
    trail: &mut Vec<usize>,
) -> bool {
    if let Some(value) = resolve(caller, dict, slot, binding) {
        return unify_slot(callee, dict, head, value, frame, trail);
    }
    match (slot, head) {
        (Slot::List(outer), Slot::List(inner)) => {
            caller.lists[*outer].len() == callee.lists[*inner].len()
                && caller.lists[*outer]
                    .iter()
                    .zip(&callee.lists[*inner])
                    .all(|(slot, head)| {
                        push(dict, (caller, slot, binding), callee, head, frame, trail)
                    })
        }
        _ => true,
    }
}

/// How narrow a scan the atom is under the current binding. A subject or object bound by the join
/// is the narrowest key there is; a constant there is usually a class or a well-known IRI (`rdf:type
/// deus:Plugin` names hundreds of facts), and a constant predicate narrows least.
fn selectivity(rule: &Rule, dict: &Dict, atom: &Atom, binding: &Binding) -> usize {
    atom.0
        .iter()
        .enumerate()
        .map(|(position, slot)| {
            let bound =
                !matches!(slot, Slot::Const(_)) && resolve(rule, dict, slot, binding).is_some();
            match (slot, position) {
                (_, 0 | 2) if bound => 4,
                (Slot::Const(_), 0 | 2) => 2,
                _ if bound => 2,
                (Slot::Const(_), _) => 1,
                _ => 0,
            }
        })
        .sum()
}

/// A call's solutions by its predicate and what the caller had bound, valid while the facts its
/// proof reads do not change.
type Memo = RefCell<FxHashMap<(Id, Vec<Option<Id>>), Rc<Vec<[Option<Id>; 3]>>>>;

/// What one evaluation of an EYE-idiom stratum reuses: the proofs of its stable backward predicates
/// ([`RuleSet::stable`]).
#[derive(Default)]
struct Cache {
    stable: Memo,
}

/// The memos an evaluation proves calls into: one round's, and the stratum's stable proofs.
#[derive(Clone, Copy, Default)]
struct Memos<'a> {
    round: Option<&'a Memo>,
    cache: Option<&'a Cache>,
}

/// What a call's solutions depend on from its caller: each position's value, or for a partly bound
/// list its length and members.
fn call_key(rule: &Rule, dict: &Dict, slot: &Slot, binding: &Binding, out: &mut Vec<Option<Id>>) {
    if let Some(value) = resolve(rule, dict, slot, binding) {
        out.push(Some(value));
        return;
    }
    match slot {
        Slot::List(index) => {
            out.push(Some(
                Id::MAX - u32::try_from(rule.lists[*index].len()).unwrap_or(0),
            ));
            for item in &rule.lists[*index] {
                call_key(rule, dict, item, binding, out);
            }
        }
        _ => out.push(None),
    }
}

struct Solver<'a> {
    dict: &'a Dict,
    view: &'a dyn Facts,
    rules: &'a RuleSet,
    memo: Option<&'a Memo>,
    cache: Option<&'a Cache>,
    depth: usize,
    stop: bool,
}

impl Solver<'_> {
    /// The next literal to evaluate: anything filter-like whose inputs are bound, else the positive
    /// atom with the most bound positions, else a negation or collection over what is bound so far.
    /// A call waits for the atoms written before it, as EYE's left-to-right proof would: a backward
    /// rule may aggregate over whatever its caller leaves unbound.
    fn pick(
        &mut self,
        rule: &Rule,
        literals: &[&Literal],
        done: &[bool],
        binding: &Binding,
    ) -> Option<usize> {
        if !self.rules.maintainable {
            return self.pick_in_order(rule, literals, done, binding);
        }
        let mut best: Option<(usize, usize)> = None;
        let mut fallback = None;
        let mut pending_atom = false;
        for (index, literal) in literals.iter().enumerate() {
            if done[index] {
                continue;
            }
            match literal {
                Literal::Call(_) if pending_atom => {}
                Literal::Pos(atom) | Literal::Call(atom) => {
                    pending_atom = true;
                    let score = selectivity(rule, self.dict, atom, binding);
                    if best.is_none_or(|(_, best)| score > best) {
                        best = Some((index, score));
                    }
                }
                other => {
                    if rule.inputs(other).iter().all(|var| binding[*var].is_some()) {
                        return Some(index);
                    }
                    if fallback.is_none()
                        && matches!(other, Literal::Neg { .. } | Literal::Collect { .. })
                    {
                        fallback = Some(index);
                    }
                }
            }
        }
        best.map(|(index, _)| index).or(fallback)
    }

    /// For a stratum written in EYE's idiom (backward rules, aggregates): a builtin as soon as its
    /// inputs are bound, else the next atom as written unless another has far fewer solutions under
    /// the current binding. A call counts only once the atoms written before it are done.
    fn pick_in_order(
        &mut self,
        rule: &Rule,
        literals: &[&Literal],
        done: &[bool],
        binding: &Binding,
    ) -> Option<usize> {
        let mut atoms = Vec::new();
        let mut fallback = None;
        for (index, literal) in literals.iter().enumerate() {
            if done[index] {
                continue;
            }
            match literal {
                Literal::Call(_) if !atoms.is_empty() => {}
                Literal::Pos(_) | Literal::Call(_) => atoms.push(index),
                other => {
                    if rule.inputs(other).iter().all(|var| binding[*var].is_some()) {
                        return Some(index);
                    }
                    if fallback.is_none()
                        && matches!(other, Literal::Neg { .. } | Literal::Collect { .. })
                    {
                        fallback = Some(index);
                    }
                }
            }
        }
        if atoms.len() <= 1 {
            return atoms.first().copied().or(fallback);
        }
        // The written order, unless another atom is far smaller: the author ordered the body for
        // EYE, which proves left to right, and a modest saving early can multiply the work later
        // (binding a module's operations before the scan they do not narrow).
        let first = atoms[0];
        let mut chosen = first;
        let mut smallest = self.estimate(rule, literals[first], binding);
        let written = smallest;
        for &index in &atoms[1..] {
            let estimate = self.estimate(rule, literals[index], binding);
            if estimate.saturating_mul(FAR_SMALLER) < written && estimate < smallest {
                chosen = index;
                smallest = estimate;
            }
        }
        Some(chosen)
    }

    /// How many solutions an atom has as things stand; a call is proved (and memoized) to find out.
    fn estimate(&mut self, rule: &Rule, literal: &Literal, binding: &Binding) -> usize {
        match literal {
            Literal::Pos(atom) => self
                .view
                .estimate(&pattern(rule, self.dict, atom, binding), ESTIMATE_CAP),
            Literal::Call(atom) => self.call(rule, atom, binding).len(),
            _ => usize::MAX,
        }
    }

    fn solve(
        &mut self,
        rule: &Rule,
        literals: &[&Literal],
        done: &mut Vec<bool>,
        binding: &mut Binding,
        trail: &mut Vec<usize>,
        emit: &mut dyn FnMut(&Binding) -> bool,
    ) {
        if self.stop {
            return;
        }
        let Some(index) = self.pick(rule, literals, done, binding) else {
            if done.iter().all(|done| *done) && !emit(binding) {
                self.stop = true;
            }
            return;
        };
        done[index] = true;
        let dict = self.dict;
        // Each arm binds what the literal concludes, recurses, and undoes from `mark`.
        let mark = trail.len();
        let mut next = |solver: &mut Self, binding: &mut Binding, trail: &mut Vec<usize>| {
            solver.solve(rule, literals, done, binding, trail, emit);
        };
        match literals[index] {
            Literal::Pos(atom) => {
                let query = pattern(rule, dict, atom, binding);
                let mut matches = Vec::new();
                self.view.scan(&query, &mut |triple| matches.push(triple));
                for triple in matches {
                    if self.stop {
                        break;
                    }
                    if unify(rule, dict, atom, &triple, binding, trail) {
                        next(self, binding, trail);
                        undo(binding, trail, mark);
                    }
                }
            }
            Literal::Call(atom) => {
                for values in self.call(rule, atom, binding).iter() {
                    if self.stop {
                        break;
                    }
                    if unify_values(rule, dict, atom, values, binding, trail) {
                        next(self, binding, trail);
                        undo(binding, trail, mark);
                    }
                }
            }
            Literal::Neg { body, .. } => {
                if !self.exists(rule, body, binding, trail) {
                    next(self, binding, trail);
                }
            }
            Literal::Collect {
                template,
                body,
                out,
                ..
            } => {
                let list = self.collect(rule, template, body, binding, trail);
                if unify_slot(rule, dict, &Slot::Var(*out), list, binding, trail) {
                    next(self, binding, trail);
                }
                undo(binding, trail, mark);
            }
            Literal::Matches {
                arg,
                pattern,
                regex,
                negate,
            } => {
                let compiled = match regex {
                    Some(regex) => Some(regex.clone()),
                    None => resolve(rule, dict, pattern, binding)
                        .and_then(|id| compiled(&dict.text(id))),
                };
                // A pattern from the data that does not compile matches nothing, negated or not.
                let value = resolve(rule, dict, arg, binding).map(|id| dict.text(id));
                if let (Some(value), Some(regex)) = (value, compiled)
                    && regex.is_match(&value) != *negate
                {
                    next(self, binding, trail);
                }
            }
            Literal::Concat { parts, out } => {
                let text: Option<String> = parts
                    .iter()
                    .map(|part| resolve(rule, dict, part, binding).map(|id| dict.text(id)))
                    .collect();
                if let Some(text) = text
                    && unify_slot(
                        rule,
                        dict,
                        out,
                        dict.intern(&string_literal(text)),
                        binding,
                        trail,
                    )
                {
                    next(self, binding, trail);
                }
                undo(binding, trail, mark);
            }
            Literal::Scrape {
                text,
                pattern,
                regex,
                out,
            } => {
                let compiled = match regex {
                    Some(regex) => Some(regex.clone()),
                    None => resolve(rule, dict, pattern, binding)
                        .and_then(|id| compiled(&dict.text(id))),
                };
                let scraped =
                    resolve(rule, dict, text, binding)
                        .zip(compiled)
                        .and_then(|(id, regex)| {
                            regex
                                .captures(&dict.text(id))
                                .and_then(|captures| captures.get(1))
                                .map(|group| group.as_str().to_owned())
                        });
                if let Some(scraped) = scraped
                    && unify_slot(
                        rule,
                        dict,
                        out,
                        dict.intern(&string_literal(scraped)),
                        binding,
                        trail,
                    )
                {
                    next(self, binding, trail);
                }
                undo(binding, trail, mark);
            }
            Literal::Compare { left, right, op } => {
                if let (Some(left), Some(right)) = (
                    resolve(rule, dict, left, binding),
                    resolve(rule, dict, right, binding),
                ) && match op {
                    Compare::NotEqual => left != right,
                    Compare::StartsWith => dict.text(left).starts_with(&dict.text(right)),
                    Compare::EndsWith => dict.text(left).ends_with(&dict.text(right)),
                    Compare::Contains => dict.text(left).contains(&dict.text(right)),
                } {
                    next(self, binding, trail);
                }
            }
            Literal::Uri { node, text } => {
                let iri = resolve(rule, dict, node, binding).and_then(|id| match dict.term(id) {
                    Term::NamedNode(node) => Some(node.into_string()),
                    _ => None,
                });
                if let Some(iri) = iri
                    && unify_slot(
                        rule,
                        dict,
                        text,
                        dict.intern(&string_literal(iri)),
                        binding,
                        trail,
                    )
                {
                    next(self, binding, trail);
                }
                undo(binding, trail, mark);
            }
            Literal::In { item, list } => {
                let items = resolve(rule, dict, list, binding)
                    .and_then(|id| dict.items(id))
                    .unwrap_or_default();
                for value in items {
                    if self.stop {
                        break;
                    }
                    if unify_slot(rule, dict, item, value, binding, trail) {
                        next(self, binding, trail);
                    }
                    undo(binding, trail, mark);
                }
            }
            Literal::Length { list, length } => {
                if let Some(items) =
                    resolve(rule, dict, list, binding).and_then(|id| dict.items(id))
                    && unify_slot(
                        rule,
                        dict,
                        length,
                        dict.intern(&integer_literal(items.len())),
                        binding,
                        trail,
                    )
                {
                    next(self, binding, trail);
                }
                undo(binding, trail, mark);
            }
            Literal::First { list, item } => {
                if let Some(first) = resolve(rule, dict, list, binding)
                    .and_then(|id| dict.items(id))
                    .and_then(|items| items.first().copied())
                    && unify_slot(rule, dict, item, first, binding, trail)
                {
                    next(self, binding, trail);
                }
                undo(binding, trail, mark);
            }
        }
        done[index] = false;
    }

    /// Every distinct solution of `atom` as a value per position: the facts that match it, then what
    /// each backward rule concluding its predicate proves for it. A position the proof leaves
    /// unbound stays `None`.
    fn call(&mut self, rule: &Rule, atom: &Atom, binding: &Binding) -> Rc<Vec<[Option<Id>; 3]>> {
        let Slot::Const(predicate) = atom.0[1] else {
            return Rc::new(self.prove(rule, atom, binding));
        };
        let memo = match self.cache {
            Some(cache) if self.rules.stable.contains(&predicate) => &cache.stable,
            _ => match self.memo {
                Some(memo) => memo,
                None => return Rc::new(self.prove(rule, atom, binding)),
            },
        };
        let mut key = Vec::new();
        for slot in &atom.0 {
            call_key(rule, self.dict, slot, binding, &mut key);
        }
        let key = (predicate, key);
        if let Some(solutions) = memo.borrow().get(&key) {
            return Rc::clone(solutions);
        }
        // A call that reaches itself with the same arguments sees no solutions rather than recursing.
        memo.borrow_mut().insert(key.clone(), Rc::new(Vec::new()));
        let solutions = Rc::new(self.prove(rule, atom, binding));
        memo.borrow_mut().insert(key, Rc::clone(&solutions));
        solutions
    }

    fn prove(&mut self, rule: &Rule, atom: &Atom, binding: &Binding) -> Vec<[Option<Id>; 3]> {
        let dict = self.dict;
        let mut solutions: Vec<[Option<Id>; 3]> = Vec::new();
        let mut seen = FxHashSet::default();
        let query = pattern(rule, dict, atom, binding);
        self.view.scan(&query, &mut |triple| {
            let values = [Some(triple[0]), Some(triple[1]), Some(triple[2])];
            if seen.insert(values) {
                solutions.push(values);
            }
        });
        let Slot::Const(predicate) = atom.0[1] else {
            return solutions;
        };
        if self.depth >= MAX_CALL_DEPTH {
            return solutions;
        }
        let rules = self.rules;
        for callee in rules.backward.get(&predicate).into_iter().flatten() {
            let head = &callee.head[0];
            let mut frame: Binding = vec![None; callee.vars];
            let mut trail = Vec::new();
            if !(0..3).all(|position| {
                push(
                    dict,
                    (rule, &atom.0[position], binding),
                    callee,
                    &head.0[position],
                    &mut frame,
                    &mut trail,
                )
            }) {
                continue;
            }
            let literals: Vec<&Literal> = callee.body.iter().collect();
            let mut done = vec![false; literals.len()];
            self.depth += 1;
            let stop = self.stop;
            self.solve(
                callee,
                &literals,
                &mut done,
                &mut frame,
                &mut trail,
                &mut |frame| {
                    let values = [
                        resolve(callee, dict, &head.0[0], frame),
                        resolve(callee, dict, &head.0[1], frame),
                        resolve(callee, dict, &head.0[2], frame),
                    ];
                    if seen.insert(values) {
                        solutions.push(values);
                    }
                    true
                },
            );
            self.stop = stop;
            self.depth -= 1;
        }
        solutions
    }

    /// The list of `template` over each distinct solution of `body`, in the order found.
    fn collect(
        &mut self,
        rule: &Rule,
        template: &Slot,
        body: &[Literal],
        binding: &mut Binding,
        trail: &mut Vec<usize>,
    ) -> Id {
        let dict = self.dict;
        let literals: Vec<&Literal> = body.iter().collect();
        let mut done = vec![false; literals.len()];
        let mut seen = FxHashSet::default();
        let mut items = Vec::new();
        let stop = self.stop;
        let mark = trail.len();
        self.solve(
            rule,
            &literals,
            &mut done,
            binding,
            trail,
            &mut |solution| {
                if seen.insert(solution.clone())
                    && let Some(value) = resolve(rule, dict, template, solution)
                {
                    items.push(value);
                }
                true
            },
        );
        undo(binding, trail, mark);
        self.stop = stop;
        dict.list(&items)
    }

    fn exists(
        &mut self,
        rule: &Rule,
        body: &[Literal],
        binding: &mut Binding,
        trail: &mut Vec<usize>,
    ) -> bool {
        let literals: Vec<&Literal> = body.iter().collect();
        let mut done = vec![false; literals.len()];
        let stop = self.stop;
        let mut found = false;
        let mark = trail.len();
        self.solve(rule, &literals, &mut done, binding, trail, &mut |_| {
            found = true;
            false
        });
        undo(binding, trail, mark);
        self.stop = stop;
        found
    }
}

fn heads(rule: &Rule, dict: &Dict, binding: &Binding, out: &mut Vec<Triple>) {
    for atom in &rule.head {
        let [Some(s), Some(p), Some(o)] = pattern(rule, dict, atom, binding) else {
            continue;
        };
        out.push([s, p, o]);
    }
}

/// The positive atoms of a negated formula, which a delta triple can falsify.
fn negated_atoms(body: &[Literal]) -> Vec<&Atom> {
    body.iter()
        .filter_map(|literal| match literal {
            Literal::Pos(atom) => Some(atom),
            _ => None,
        })
        .collect()
}

/// How a rule evaluation is started.
enum Seed<'a> {
    /// Every literal is evaluated against the view.
    None,
    /// The positive literal at `index` is bound to a delta triple and skipped.
    Pos(usize, &'a Triple),
    /// A delta triple matching one atom of the negation at `index` binds that negation's outer
    /// variables; the negation itself is still evaluated.
    Neg(usize, usize, &'a Triple),
    /// A head atom is unified with a fact, to ask whether that fact still has a derivation.
    Head(usize, &'a Triple),
}

/// Evaluates `rule` from `seed`; `emit` returns false to stop at the first solution.
fn run(
    rules: &RuleSet,
    rule: &Rule,
    seed: Seed<'_>,
    view: &dyn Facts,
    dict: &Dict,
    memos: Memos<'_>,
    emit: &mut dyn FnMut(&Binding) -> bool,
) {
    let mut binding: Binding = vec![None; rule.vars];
    let mut trail = Vec::new();
    let literals: Vec<&Literal> = rule.body.iter().collect();
    let mut done = vec![false; literals.len()];
    match seed {
        Seed::None => {}
        Seed::Pos(index, triple) => {
            let Literal::Pos(atom) = literals[index] else {
                return;
            };
            if !unify(rule, dict, atom, triple, &mut binding, &mut trail) {
                return;
            }
            done[index] = true;
        }
        Seed::Neg(index, atom_index, triple) => {
            let Literal::Neg { body, outer } = literals[index] else {
                return;
            };
            let mut local = vec![None; rule.vars];
            if !unify(
                rule,
                dict,
                negated_atoms(body)[atom_index],
                triple,
                &mut local,
                &mut Vec::new(),
            ) {
                return;
            }
            for var in outer {
                binding[*var] = local[*var];
            }
        }
        Seed::Head(index, triple) => {
            if !unify(
                rule,
                dict,
                &rule.head[index],
                triple,
                &mut binding,
                &mut trail,
            ) {
                return;
            }
        }
    }
    let mut solver = Solver {
        dict,
        view,
        rules,
        memo: memos.round,
        cache: memos.cache,
        depth: 0,
        stop: false,
    };
    solver.solve(rule, &literals, &mut done, &mut binding, &mut trail, emit);
}

/// Whether a triple fits an atom's constants; variables are checked when the atom is unified.
fn fits(atom: &Atom, triple: &Triple) -> bool {
    atom.0.iter().zip(triple).all(|(slot, value)| match slot {
        Slot::Const(id) => id == value,
        _ => true,
    })
}

/// Entries keyed by the constant predicate of the atom each names, so a delta triple is tried only
/// against atoms it can fit: with every premise as the delta (a full recomputation), trying each
/// triple against every atom of every rule dominated a stratum's cost.
struct ByPredicate<T> {
    by_predicate: FxHashMap<Id, Vec<T>>,
    /// Entries whose predicate is a variable, tried against every triple.
    any: Vec<T>,
}

impl<T: Copy> ByPredicate<T> {
    fn new(entries: impl Iterator<Item = (Slot, T)>) -> Self {
        let mut index = ByPredicate {
            by_predicate: FxHashMap::default(),
            any: Vec::new(),
        };
        for (predicate, entry) in entries {
            match predicate {
                Slot::Const(id) => index.by_predicate.entry(id).or_default().push(entry),
                _ => index.any.push(entry),
            }
        }
        index
    }

    fn candidates(&self, triple: &Triple) -> impl Iterator<Item = T> + '_ {
        self.by_predicate
            .get(&triple[1])
            .into_iter()
            .flatten()
            .chain(&self.any)
            .copied()
    }
}

/// Everything derivable in one step from `delta` triples: each positive literal a triple fits seeds
/// an evaluation of the rest of its rule against `view`.
fn step(rules: &RuleSet, delta: &[Triple], view: &dyn Facts, dict: &Dict, out: &mut Vec<Triple>) {
    let atoms = ByPredicate::new(
        rules
            .rules
            .iter()
            .enumerate()
            .flat_map(|(rule_index, rule)| {
                rule.body
                    .iter()
                    .enumerate()
                    .filter_map(move |(index, literal)| match literal {
                        Literal::Pos(atom) => Some((atom.0[1], (rule_index, index))),
                        _ => None,
                    })
            }),
    );
    for triple in delta {
        for (rule_index, index) in atoms.candidates(triple) {
            let rule = &rules.rules[rule_index];
            if let Literal::Pos(atom) = &rule.body[index]
                && fits(atom, triple)
            {
                run(
                    rules,
                    rule,
                    Seed::Pos(index, triple),
                    view,
                    dict,
                    Memos::default(),
                    &mut |binding| {
                        heads(rule, dict, binding, out);
                        true
                    },
                );
            }
        }
    }
}

/// Conclusions whose negations a delta triple can flip, evaluated against `view`.
fn negation_step(
    rules: &RuleSet,
    delta: &[Triple],
    view: &dyn Facts,
    dict: &Dict,
    out: &mut Vec<Triple>,
) {
    let atoms = ByPredicate::new(
        rules
            .rules
            .iter()
            .enumerate()
            .flat_map(|(rule_index, rule)| {
                rule.body
                    .iter()
                    .enumerate()
                    .flat_map(move |(index, literal)| match literal {
                        Literal::Neg { body, .. } => negated_atoms(body)
                            .into_iter()
                            .enumerate()
                            .map(|(atom_index, atom)| (atom.0[1], (rule_index, index, atom_index)))
                            .collect::<Vec<_>>(),
                        _ => Vec::new(),
                    })
            }),
    );
    for triple in delta {
        for (rule_index, index, atom_index) in atoms.candidates(triple) {
            let rule = &rules.rules[rule_index];
            if let Literal::Neg { body, .. } = &rule.body[index]
                && fits(negated_atoms(body)[atom_index], triple)
            {
                run(
                    rules,
                    rule,
                    Seed::Neg(index, atom_index, triple),
                    view,
                    dict,
                    Memos::default(),
                    &mut |binding| {
                        heads(rule, dict, binding, out);
                        true
                    },
                );
            }
        }
    }
}

fn has_negation(rules: &RuleSet) -> bool {
    rules.rules.iter().any(|rule| {
        rule.body
            .iter()
            .any(|literal| matches!(literal, Literal::Neg { .. }))
    })
}

/// Inserts `frontier` and everything it entails into `derived`, to a fixpoint. Returns what was new.
fn saturate(
    rules: &RuleSet,
    premises: &dyn Facts,
    derived: &mut TripleSet,
    mut frontier: Vec<Triple>,
    dict: &Dict,
) -> Vec<Triple> {
    let mut added = Vec::new();
    frontier.retain(|triple| derived.insert(*triple));
    added.extend_from_slice(&frontier);
    while !frontier.is_empty() {
        let mut next = Vec::new();
        {
            let view = Union {
                premises,
                derived,
                excluded: None,
            };
            step(rules, &frontier, &view, dict, &mut next);
        }
        next.retain(|triple| derived.insert(*triple));
        added.extend_from_slice(&next);
        frontier = next;
    }
    added
}

/// One group of rules from nothing against `premises` plus `derived`; what is new joins `derived`.
fn round(
    rules: &RuleSet,
    group: &Group,
    premises: &dyn Facts,
    derived: &mut TripleSet,
    dict: &Dict,
    cache: &Cache,
) -> bool {
    let mut found = Vec::new();
    // Proofs that read this group's own conclusions hold for one round only.
    let memo = Memo::default();
    {
        let view = Union {
            premises,
            derived,
            excluded: None,
        };
        for rule in group.rules.iter().map(|index| &rules.rules[*index]) {
            run(
                rules,
                rule,
                Seed::None,
                &view,
                dict,
                Memos {
                    round: Some(&memo),
                    cache: Some(cache),
                },
                &mut |binding| {
                    heads(rule, dict, binding, &mut found);
                    true
                },
            );
        }
    }
    found.retain(|triple| derived.insert(*triple));
    !found.is_empty()
}

/// The stratum's materialisation over `premises`, computed from nothing.
pub fn full(rules: &RuleSet, premises: &dyn Facts, dict: &Dict) -> TripleSet {
    let mut derived = TripleSet::default();
    if rules.maintainable {
        let first = {
            let empty = TripleSet::default();
            let mut first = Vec::new();
            let view = Union {
                premises,
                derived: &empty,
                excluded: None,
            };
            for rule in &rules.rules {
                run(
                    rules,
                    rule,
                    Seed::None,
                    &view,
                    dict,
                    Memos::default(),
                    &mut |binding| {
                        heads(rule, dict, binding, &mut first);
                        true
                    },
                );
            }
            first
        };
        saturate(rules, premises, &mut derived, first, dict);
    } else {
        // A conclusion may feed a backward rule another body calls, which no delta-seeded step
        // sees: each group runs once its inputs are complete, a cyclic one until nothing is new.
        let cache = Cache::default();
        for group in &rules.groups {
            while round(rules, group, premises, &mut derived, dict, &cache) && group.cyclic {}
        }
    }
    derived
}

#[derive(Default, Debug)]
pub struct Change {
    pub added: Vec<Triple>,
    pub removed: Vec<Triple>,
}

/// DRed: updates `derived` (the materialisation over the premises *before* the change) to the
/// materialisation over `premises`, which `plus`/`minus` describe relative to before. Only for a
/// [`RuleSet::maintainable`] stratum.
pub fn maintain(
    rules: &RuleSet,
    premises: &dyn Facts,
    plus: &TripleSet,
    minus: &TripleSet,
    derived: &mut TripleSet,
    dict: &Dict,
) -> Change {
    let negates = has_negation(rules);
    let plus_list: Vec<Triple> = plus.iter().copied().collect();
    let minus_list: Vec<Triple> = minus.iter().copied().collect();

    // 1. Overdelete: everything with a derivation through a removed premise (or through a premise
    //    whose arrival falsifies a negation), against the state before the change.
    let mut deleted = TripleSet::default();
    {
        let before = Before {
            after: premises,
            plus,
            minus,
        };
        let view = Union {
            premises: &before,
            derived,
            excluded: None,
        };
        let mut candidates = Vec::new();
        step(rules, &minus_list, &view, dict, &mut candidates);
        if negates {
            negation_step(rules, &plus_list, &view, dict, &mut candidates);
        }
        let mut frontier: Vec<Triple> = candidates
            .into_iter()
            .filter(|triple| derived.contains(triple) && deleted.insert(*triple))
            .collect();
        while !frontier.is_empty() {
            let mut next = Vec::new();
            step(rules, &frontier, &view, dict, &mut next);
            frontier = next
                .into_iter()
                .filter(|triple| derived.contains(triple) && deleted.insert(*triple))
                .collect();
        }
    }

    // 2. Rederive: an overdeleted fact survives if it still has a one-step derivation from what is left.
    let mut rederived = Vec::new();
    {
        let view = Union {
            premises,
            derived,
            excluded: Some(&deleted),
        };
        for triple in deleted.iter() {
            let mut found = false;
            'rules: for rule in &rules.rules {
                for index in 0..rule.head.len() {
                    run(
                        rules,
                        rule,
                        Seed::Head(index, triple),
                        &view,
                        dict,
                        Memos::default(),
                        &mut |_| {
                            found = true;
                            false
                        },
                    );
                    if found {
                        break 'rules;
                    }
                }
            }
            if found {
                rederived.push(*triple);
            }
        }
    }

    // 3. Insert: the new premises, the rederived facts, and what a vanished negated fact unblocks.
    for triple in deleted.iter() {
        derived.remove(triple);
    }
    let mut frontier = Vec::new();
    {
        let view = Union {
            premises,
            derived,
            excluded: None,
        };
        step(rules, &plus_list, &view, dict, &mut frontier);
        if negates {
            negation_step(rules, &minus_list, &view, dict, &mut frontier);
        }
    }
    frontier.extend(rederived);
    let inserted: FxHashSet<Triple> = saturate(rules, premises, derived, frontier, dict)
        .into_iter()
        .collect();

    Change {
        added: inserted
            .iter()
            .filter(|triple| !deleted.contains(triple))
            .copied()
            .collect(),
        removed: deleted
            .iter()
            .filter(|triple| !inserted.contains(*triple))
            .copied()
            .collect(),
    }
}
