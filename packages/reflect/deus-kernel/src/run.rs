//
// Copyright 2026 DXOS.org
//

//! Loads an image and calls its `(main "hash")` with `()`, as `src/kernel/run.ts` does.

use crate::host::Host;
use crate::machine::{Machine, Options};
use crate::sexp::{read_all, Sexp};
use crate::text::{string, text};
use crate::value::{unit, Fail};

/// Marks an image appended to the kernel's own executable (`deus build --native`). The trailer
/// is text, so DEUS code can write it: `…image, 20-digit decimal byte length, "DEUSIMG1"`.
const TRAILER: &[u8; 8] = b"DEUSIMG1";
const LENGTH_DIGITS: usize = 20;

/// The image appended to this executable, if any.
pub fn embedded_image() -> Option<String> {
    let path = std::env::current_exe().ok()?;
    let bytes = std::fs::read(path).ok()?;
    let len = bytes.len();
    let tail = TRAILER.len() + LENGTH_DIGITS;
    if len < tail || &bytes[len - TRAILER.len()..] != TRAILER {
        return None;
    }
    let digits = std::str::from_utf8(&bytes[len - tail..len - TRAILER.len()]).ok()?;
    let size: usize = digits.trim_start_matches('0').parse().unwrap_or(0);
    let start = (len - tail).checked_sub(size)?;
    Some(String::from_utf8_lossy(&bytes[start..len - tail]).into_owned())
}

/// Runs an image; returns the process exit code (70 for a defect, 71 for a panic).
pub fn run_image(image: &str, host: Box<dyn Host>, options: &Options) -> i32 {
    let mut machine = Machine::new(crate::prims::create(), host, options);
    let forms = match read_all(&text(image)) {
        Ok(forms) => forms,
        Err(err) => {
            machine
                .host
                .eprint(&format!("panic: malformed image: {err}\n"));
            return 71;
        }
    };
    let main = forms.iter().find_map(|form| match form {
        Sexp::List(items) if matches!(items.first(), Some(Sexp::Sym(head)) if &**head == "main") => match items.get(1) {
            Some(Sexp::Str(hash)) => Some(string(hash)),
            _ => None,
        },
        _ => None,
    });
    let Some(main) = main else {
        machine
            .host
            .eprint("panic: malformed image: no (main \"hash\") form\n");
        return 71;
    };
    let result = machine
        .load(&forms)
        .and_then(|_| machine.call(&main, vec![unit()]));
    let code = match result {
        Ok(_) => {
            let rows = machine.profile_report();
            if machine.profile.is_some() {
                let lines: Vec<String> = rows
                    .iter()
                    .take(40)
                    .map(|(count, hash)| format!("  {count}\t{hash}"))
                    .collect();
                machine.host.eprint(&format!(
                    "profile (entries by definition):\n{}\n",
                    lines.join("\n")
                ));
            }
            0
        }
        Err(Fail::Exit(code)) => code,
        Err(Fail::Defect(message)) | Err(Fail::Budget(message)) => {
            let trace: String = machine
                .defect_trace
                .iter()
                .map(|hash| format!("  at #{hash}\n"))
                .collect();
            machine.host.eprint(&format!("defect: {message}\n{trace}"));
            if machine.trace.is_some() {
                let recent: Vec<String> = machine
                    .recent()
                    .iter()
                    .map(|hash| hash.to_string())
                    .collect();
                machine
                    .host
                    .eprint(&format!("recent definitions:\n  {}\n", recent.join("\n  ")));
            }
            70
        }
        Err(Fail::Suspend { ability, index, .. }) => {
            machine
                .host
                .eprint(&format!("panic: unhandled {ability} operation {index}\n"));
            71
        }
        Err(Fail::Panic(message)) => {
            machine.host.eprint(&format!("panic: {message}\n"));
            71
        }
    };
    machine.host.flush();
    code
}
