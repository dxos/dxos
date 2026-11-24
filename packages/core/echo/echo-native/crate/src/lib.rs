//! echo-native: ECHO's storage engine (Turso + Automerge) compiled to WebAssembly.
//!
//! The ABI is a handful of `extern "C"` functions over two buffers in linear memory: JS writes a
//! call's arguments into the input buffer (`input_reserve`), calls an op, and reads the result from the
//! output buffer (`output_ptr`, length returned by the op) through a `DataView`. A negative return
//! `-(len + 1)` is an error whose UTF-8 message is the output. No per-value bindings, no JSON across the
//! boundary.

mod doc;
mod engine;
mod sql;
mod wire;

use std::cell::RefCell;
use std::collections::HashMap;

use engine::{Engine, FileState, SharedFile};
use wire::{Reader, Writer};

#[derive(Default)]
struct State {
    input: Vec<u8>,
    output: Writer,
    files: HashMap<String, SharedFile>,
    engines: Vec<Option<Engine>>,
}

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

/// Grows the input buffer to `len` bytes and returns where JS writes the arguments.
#[no_mangle]
pub extern "C" fn input_reserve(len: u32) -> *mut u8 {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.input.resize(len as usize, 0);
        state.input.as_mut_ptr()
    })
}

#[no_mangle]
pub extern "C" fn output_ptr() -> *const u8 {
    STATE.with(|state| state.borrow().output.buf.as_ptr())
}

/// Runs `op` over the input's first `len` bytes and returns the output length, or `-(len + 1)` with the
/// error message as output.
fn call(
    len: u32,
    op: impl FnOnce(
        &mut Reader<'_>,
        &mut Writer,
        &mut HashMap<String, SharedFile>,
        &mut Vec<Option<Engine>>,
    ) -> Result<(), String>,
) -> i32 {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        let State {
            input,
            output,
            files,
            engines,
        } = &mut *state;
        output.clear();
        let mut reader = Reader::new(&input[..len as usize]);
        match op(&mut reader, output, files, engines) {
            Ok(()) => output.len() as i32,
            Err(message) => {
                output.clear();
                output.buf.extend_from_slice(message.as_bytes());
                -(output.len() as i32) - 1
            }
        }
    })
}

fn engine(engines: &mut [Option<Engine>], handle: u32) -> Result<&mut Engine, String> {
    engines
        .get_mut(handle as usize)
        .and_then(Option::as_mut)
        .ok_or_else(|| format!("no database {handle}"))
}

/// Opens a space's database on a file. Input: path, space id, actor id, whether the file positions its
/// own blocks (u8), and the Feed typename. Output: the handle (u32).
#[no_mangle]
pub extern "C" fn db_open(len: u32) -> i32 {
    call(len, |input, out, files, engines| {
        let path = input.str()?.to_owned();
        let space_id = input.str()?.to_owned();
        let actor_id = input.str()?.to_owned();
        let assign_positions = input.u8()? == 1;
        let feed_typename = input.str()?.to_owned();
        let file = match files.get(&path) {
            Some(file) => file.clone(),
            None => {
                let file = FileState::open(engine::open_database(&path)?)?;
                files.insert(path, file.clone());
                file
            }
        };
        let opened = Engine::open(file, space_id, actor_id, assign_positions, feed_typename)?;
        engines.push(Some(opened));
        out.u32((engines.len() - 1) as u32);
        Ok(())
    })
}

#[no_mangle]
pub extern "C" fn db_close(handle: u32) -> i32 {
    call(0, |_, _, _, engines| {
        if let Some(slot) = engines.get_mut(handle as usize) {
            *slot = None;
        }
        Ok(())
    })
}

/// Drops a file from the registry, as deleting it would (memory files lose their contents).
#[no_mangle]
pub extern "C" fn file_drop(len: u32) -> i32 {
    call(len, |input, _, files, _| {
        files.remove(input.str()?);
        Ok(())
    })
}

#[no_mangle]
pub extern "C" fn db_write(handle: u32, len: u32) -> i32 {
    call(len, |input, out, _, engines| {
        engine(engines, handle)?.write(input, out)
    })
}

#[no_mangle]
pub extern "C" fn db_edit(handle: u32, len: u32) -> i32 {
    call(len, |input, out, _, engines| {
        engine(engines, handle)?.edit(input, out)
    })
}

/// Logs pending document changes for change queries.
#[no_mangle]
pub extern "C" fn db_log_changes(handle: u32) -> i32 {
    call(0, |_, _, _, engines| engine(engines, handle)?.log_changes())
}

#[no_mangle]
pub extern "C" fn db_query(handle: u32, len: u32) -> i32 {
    call(len, |input, out, _, engines| {
        engine(engines, handle)?.query(input, out)
    })
}

#[no_mangle]
pub extern "C" fn db_document(handle: u32, len: u32) -> i32 {
    call(len, |input, out, _, engines| {
        let id = input.str()?.to_owned();
        engine(engines, handle)?.document(&id, out)
    })
}

#[no_mangle]
pub extern "C" fn db_invalidate(handle: u32, len: u32) -> i32 {
    call(len, |input, _, _, engines| {
        let count = input.u32()?;
        let mut ids = Vec::new();
        for _ in 0..count {
            ids.push(input.str()?.to_owned());
        }
        engine(engines, handle)?.invalidate(&ids);
        Ok(())
    })
}

#[no_mangle]
pub extern "C" fn db_sync_state(handle: u32, len: u32) -> i32 {
    call(len, |input, out, _, engines| {
        let namespace = input.str()?.to_owned();
        engine(engines, handle)?.sync_state(&namespace, out)
    })
}

#[no_mangle]
pub extern "C" fn db_reset_sync(handle: u32, len: u32) -> i32 {
    call(len, |input, _, _, engines| {
        engine(engines, handle)?.reset_sync(input)
    })
}

#[no_mangle]
pub extern "C" fn db_apply_pulled(handle: u32, len: u32) -> i32 {
    call(len, |input, out, _, engines| {
        engine(engines, handle)?.apply_pulled(input, out)
    })
}

#[no_mangle]
pub extern "C" fn db_unpositioned(handle: u32, len: u32) -> i32 {
    call(len, |input, out, _, engines| {
        engine(engines, handle)?.unpositioned(input, out)
    })
}

#[no_mangle]
pub extern "C" fn db_set_positions(handle: u32, len: u32) -> i32 {
    call(len, |input, _, _, engines| {
        engine(engines, handle)?.set_positions(input)
    })
}

/// Statements the engine has run since open, for the benchmark report.
#[no_mangle]
pub extern "C" fn db_statements(handle: u32) -> f64 {
    STATE.with(|state| {
        state
            .borrow()
            .engines
            .get(handle as usize)
            .and_then(Option::as_ref)
            .map(|e| e.statements() as f64)
            .unwrap_or(0.0)
    })
}

/// Microseconds spent per write phase since open, as `name=value` lines, for the benchmark report.
#[no_mangle]
pub extern "C" fn db_profile(handle: u32) -> i32 {
    call(0, |_, out, _, engines| {
        let profile = &engine(engines, handle)?.profile;
        let text = format!(
            "automerge_change={}\nautomerge_save={}\nautomerge_load={}\nblocks_sql={}\nindex_read={}\nindex_sql={}\nchanges={}\ntransaction={}",
            profile.automerge_change,
            profile.automerge_save,
            profile.automerge_load,
            profile.blocks_sql,
            profile.index_read,
            profile.index_sql,
            profile.changes,
            profile.transaction
        );
        out.buf.extend_from_slice(text.as_bytes());
        Ok(())
    })
}
