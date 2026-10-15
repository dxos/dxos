//
// Copyright 2026 DXOS.org
//

//! The embedding API of the `wasm32-unknown-unknown` kernel (P7): an embedder (a Cloudflare
//! Worker, a browser) loads an image, starts an entry, and answers each operation nothing in the
//! program handles. The machine suspends with its stack intact while the embedder awaits, so
//! asynchronous platform calls need no asyncify and no threads.
//!
//! Calls exchange JSON. A result is one of
//! `{"state":"done","value":…}`, `{"state":"suspend","ability":…,"op":n,"args":[…]}`,
//! `{"state":"defect","message":…,"trace":[…]}`, `{"state":"panic","message":…}` and
//! `{"state":"exit","code":n}`.

use std::cell::RefCell;

use crate::host::Host;
use crate::json::{decode, encode, entry, iri_of, string};
use crate::machine::{Machine, Options};
use crate::sexp::{read_all, Sexp};
use crate::text::text;
use crate::value::{Fail, Value};

/// Every unhandled operation, `IO` included, goes to the embedder.
struct EmbedHost;

impl Host for EmbedHost {
    fn print(&mut self, _: &str) {}
    fn eprint(&mut self, _: &str) {}
    fn read_file(&mut self, _: &str) -> Option<Vec<u8>> {
        None
    }
    fn write_file(&mut self, _: &str, _: &[u8], _: bool) -> Result<(), String> {
        Err("no file system".into())
    }
    fn exists(&mut self, _: &str) -> bool {
        false
    }
    fn is_dir(&mut self, _: &str) -> bool {
        false
    }
    fn list_dir(&mut self, _: &str) -> Vec<String> {
        Vec::new()
    }
    fn mkdirp(&mut self, _: &str) -> Result<(), String> {
        Err("no file system".into())
    }
    fn remove(&mut self, _: &str) {}
    fn args(&mut self) -> Vec<String> {
        Vec::new()
    }
    fn time(&mut self) -> i32 {
        0
    }
    fn wall_clock(&mut self) -> String {
        "0".into()
    }
    fn read_stdin(&mut self) -> String {
        String::new()
    }
    fn get_env(&mut self, _: &str) -> Option<String> {
        None
    }
    fn exec(&mut self, _: &str, _: &[String]) -> (i32, String, String) {
        (127, String::new(), "no processes".into())
    }
    fn suspends(&self) -> bool {
        true
    }
}

thread_local! {
    static MACHINE: RefCell<Option<Machine>> = const { RefCell::new(None) };
    static OUTPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
    /// The image the machine was loaded from and its `main`, to reuse the machine for the same image.
    static LOADED: RefCell<Option<(Vec<u8>, String)>> = const { RefCell::new(None) };
}

/// Allocates `len` bytes for the embedder to write input into.
#[no_mangle]
pub extern "C" fn deus_alloc(len: usize) -> *mut u8 {
    let mut buffer = Vec::<u8>::with_capacity(len.max(1));
    let pointer = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    pointer
}

/// Frees memory from `deus_alloc`.
///
/// # Safety
/// `pointer` and `len` must come from one `deus_alloc` call.
#[no_mangle]
pub unsafe extern "C" fn deus_free(pointer: *mut u8, len: usize) {
    drop(Vec::from_raw_parts(pointer, 0, len.max(1)));
}

/// The bytes of the last result; their length is `deus_output_len`.
#[no_mangle]
pub extern "C" fn deus_output() -> *const u8 {
    OUTPUT.with(|output| output.borrow().as_ptr())
}

#[no_mangle]
pub extern "C" fn deus_output_len() -> usize {
    OUTPUT.with(|output| output.borrow().len())
}

/// # Safety
/// `pointer` must address `len` initialized bytes.
unsafe fn input(pointer: *const u8, len: usize) -> String {
    String::from_utf8_lossy(std::slice::from_raw_parts(pointer, len)).into_owned()
}

fn finish(machine: &mut Machine, result: Result<Value, Fail>) -> String {
    let fields = match result {
        Ok(value) => vec![
            entry("state", "\"done\""),
            entry("value", &encode(&value, &machine.symbols, &machine.iris)),
        ],
        Err(Fail::Suspend {
            ability,
            index,
            args,
        }) => {
            let args: Vec<String> = args
                .iter()
                .map(|arg| encode(arg, &machine.symbols, &machine.iris))
                .collect();
            let iri = iri_of(&ability, &machine.iris);
            vec![
                entry("state", "\"suspend\""),
                entry("ability", &string(&iri)),
                entry("hash", &string(&ability)),
                entry("op", &index.to_string()),
                entry("args", &format!("[{}]", args.join(","))),
            ]
        }
        Err(Fail::Defect(message)) | Err(Fail::Budget(message)) => {
            let trace: Vec<String> = machine
                .defect_trace
                .iter()
                .map(|hash| string(&iri_of(hash, &machine.iris)))
                .collect();
            vec![
                entry("state", "\"defect\""),
                entry("message", &string(&message)),
                entry("trace", &format!("[{}]", trace.join(","))),
            ]
        }
        Err(Fail::Panic(message)) => vec![
            entry("state", "\"panic\""),
            entry("message", &string(&message)),
        ],
        Err(Fail::Exit(code)) => vec![entry("state", "\"exit\""), entry("code", &code.to_string())],
    };
    format!("{{{}}}", fields.join(","))
}

fn respond(json: String) -> usize {
    OUTPUT.with(|output| *output.borrow_mut() = json.into_bytes());
    deus_output_len()
}

/// Loads an image and calls `entry` (a hash, or the image's `main` when empty) with the JSON
/// value `argument`. Returns the length of the result at `deus_output`. Given the same image
/// bytes as the last call, it reuses that machine's compiled code (`Machine::reset`).
///
/// # Safety
/// Each pointer must address its length of initialized bytes.
#[no_mangle]
pub unsafe extern "C" fn deus_start(
    image: *const u8,
    image_len: usize,
    entry_hash: *const u8,
    entry_len: usize,
    argument: *const u8,
    argument_len: usize,
) -> usize {
    let bytes = std::slice::from_raw_parts(image, image_len);
    let mut entry_hash = input(entry_hash, entry_len);
    let argument = input(argument, argument_len);
    let cached = MACHINE.with(|cell| cell.borrow_mut().take()).filter(|_| {
        LOADED.with(|loaded| matches!(&*loaded.borrow(), Some((previous, _)) if previous.as_slice() == bytes))
    });
    let reused = cached.is_some();
    let mut machine = match cached {
        Some(mut machine) => {
            machine.reset();
            machine
        }
        None => {
            LOADED.with(|loaded| *loaded.borrow_mut() = None);
            Machine::new(
                crate::prims::create(),
                Box::new(EmbedHost),
                &Options::default(),
            )
        }
    };
    let json = (|| {
        if reused {
            if entry_hash.is_empty() {
                entry_hash = LOADED.with(|loaded| {
                    loaded
                        .borrow()
                        .as_ref()
                        .map(|(_, main)| main.clone())
                        .unwrap_or_default()
                });
            }
        } else {
            let forms = read_all(&text(&String::from_utf8_lossy(bytes))).map_err(Fail::Panic)?;
            let main = forms
                .iter()
                .find_map(|form| match form {
                    Sexp::List(items) if matches!(items.first(), Some(Sexp::Sym(head)) if &**head == "main") => match items.get(1) {
                        Some(Sexp::Str(hash)) => Some(crate::text::string(hash)),
                        _ => None,
                    },
                    _ => None,
                })
                .unwrap_or_default();
            machine.load(&forms)?;
            LOADED.with(|loaded| *loaded.borrow_mut() = Some((bytes.to_vec(), main.clone())));
            if entry_hash.is_empty() {
                entry_hash = main;
            }
        }
        if entry_hash.is_empty() {
            return Err(Fail::Panic("image has no (main \"hash\") form".into()));
        }
        decode(&argument, &mut machine.symbols, &machine.iris).map_err(Fail::Panic)
    })();
    let json = match json {
        Ok(argument) => {
            let result = machine.call(&entry_hash, vec![argument]);
            finish(&mut machine, result)
        }
        Err(fail) => finish(&mut machine, Err(fail)),
    };
    MACHINE.with(|cell| *cell.borrow_mut() = Some(machine));
    respond(json)
}

/// Answers the pending operation with the JSON value `answer`; returns as `deus_start`.
///
/// # Safety
/// `answer` must address `answer_len` initialized bytes.
#[no_mangle]
pub unsafe extern "C" fn deus_resume(answer: *const u8, answer_len: usize) -> usize {
    let answer = input(answer, answer_len);
    let json = MACHINE.with(|cell| {
        let mut slot = cell.borrow_mut();
        let Some(machine) = slot.as_mut() else {
            return format!(
                "{{{},{}}}",
                entry("state", "\"panic\""),
                entry("message", &string("no machine"))
            );
        };
        let result = decode(&answer, &mut machine.symbols, &machine.iris)
            .map_err(Fail::Panic)
            .and_then(|value| machine.resume(value));
        finish(machine, result)
    });
    respond(json)
}
