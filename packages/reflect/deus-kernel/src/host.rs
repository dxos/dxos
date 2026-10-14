//
// Copyright 2026 DXOS.org
//

//! Host IO. The kernel runs `IO` requests no DEUS handler caught against a `Host`: the native
//! and WASI host below, or one an embedder supplies (a Cloudflare Worker passes its own).

use std::io::{Read, Write};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use crate::machine::Machine;
use crate::text::{string, text, Text};
use crate::value::*;

/// The `IO` ability's operations, in declaration order (deus/builtins.deus).
pub const IO_OPS: [&str; 18] = [
    "print",
    "eprint",
    "readFile",
    "writeFile",
    "exists",
    "listDir",
    "mkdirp",
    "remove",
    "args",
    "exit",
    "time",
    "readStdin",
    "writeBytes",
    "getEnv",
    "isDir",
    "wallClock",
    "appendFile",
    "exec",
];

/// What a kernel needs from the place it runs.
pub trait Host {
    fn print(&mut self, chunk: &str);
    fn eprint(&mut self, chunk: &str);
    fn read_file(&mut self, path: &str) -> Option<Vec<u8>>;
    fn write_file(&mut self, path: &str, bytes: &[u8], append: bool) -> Result<(), String>;
    fn exists(&mut self, path: &str) -> bool;
    fn is_dir(&mut self, path: &str) -> bool;
    fn list_dir(&mut self, path: &str) -> Vec<String>;
    fn mkdirp(&mut self, path: &str) -> Result<(), String>;
    fn remove(&mut self, path: &str);
    fn args(&mut self) -> Vec<String>;
    /// Milliseconds since the run started.
    fn time(&mut self) -> i32;
    /// Nanoseconds since the Unix epoch, as decimal text.
    fn wall_clock(&mut self) -> String;
    fn read_stdin(&mut self) -> String;
    fn get_env(&mut self, name: &str) -> Option<String>;
    /// (exit code, stdout, stderr); 127 when the program cannot start.
    fn exec(&mut self, program: &str, args: &[String]) -> (i32, String, String);
    fn flush(&mut self) {}
}

/// The process's own file system, environment and streams (native, or WASI on wasm32-wasip1).
pub struct SystemHost {
    args: Vec<String>,
    start: Instant,
    stdout: std::io::BufWriter<std::io::Stdout>,
}

impl SystemHost {
    pub fn new(args: Vec<String>) -> SystemHost {
        SystemHost {
            args,
            start: Instant::now(),
            stdout: std::io::BufWriter::with_capacity(1 << 16, std::io::stdout()),
        }
    }
}

fn parent(path: &str) -> Option<&std::path::Path> {
    std::path::Path::new(path)
        .parent()
        .filter(|dir| !dir.as_os_str().is_empty())
}

impl Host for SystemHost {
    fn print(&mut self, chunk: &str) {
        let _ = self.stdout.write_all(chunk.as_bytes());
    }

    fn eprint(&mut self, chunk: &str) {
        // Keep the two streams in the order the program wrote them.
        let _ = self.stdout.flush();
        let _ = std::io::stderr().write_all(chunk.as_bytes());
    }

    fn read_file(&mut self, path: &str) -> Option<Vec<u8>> {
        std::fs::read(path).ok()
    }

    fn write_file(&mut self, path: &str, bytes: &[u8], append: bool) -> Result<(), String> {
        if let Some(dir) = parent(path) {
            std::fs::create_dir_all(dir).map_err(|err| err.to_string())?;
        }
        if append {
            let mut file = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(path)
                .map_err(|err| err.to_string())?;
            file.write_all(bytes).map_err(|err| err.to_string())
        } else {
            std::fs::write(path, bytes).map_err(|err| err.to_string())
        }
    }

    fn exists(&mut self, path: &str) -> bool {
        std::path::Path::new(path).exists()
    }

    fn is_dir(&mut self, path: &str) -> bool {
        std::path::Path::new(path).is_dir()
    }

    fn list_dir(&mut self, path: &str) -> Vec<String> {
        std::fs::read_dir(path)
            .map(|entries| {
                entries
                    .flatten()
                    .map(|entry| entry.file_name().to_string_lossy().into_owned())
                    .collect()
            })
            .unwrap_or_default()
    }

    fn mkdirp(&mut self, path: &str) -> Result<(), String> {
        std::fs::create_dir_all(path).map_err(|err| err.to_string())
    }

    fn remove(&mut self, path: &str) {
        let target = std::path::Path::new(path);
        let _ = if target.is_dir() {
            std::fs::remove_dir_all(target)
        } else {
            std::fs::remove_file(target)
        };
    }

    fn args(&mut self) -> Vec<String> {
        self.args.clone()
    }

    fn time(&mut self) -> i32 {
        self.start.elapsed().as_millis() as i32
    }

    fn wall_clock(&mut self) -> String {
        let micros = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|elapsed| elapsed.as_micros())
            .unwrap_or(0);
        (micros * 1000).to_string()
    }

    fn read_stdin(&mut self) -> String {
        let mut input = String::new();
        let _ = std::io::stdin().read_to_string(&mut input);
        input
    }

    fn get_env(&mut self, name: &str) -> Option<String> {
        std::env::var(name).ok()
    }

    fn exec(&mut self, program: &str, args: &[String]) -> (i32, String, String) {
        let _ = self.stdout.flush();
        match std::process::Command::new(program).args(args).output() {
            Ok(output) => (
                output.status.code().unwrap_or(1),
                String::from_utf8_lossy(&output.stdout).into_owned(),
                String::from_utf8_lossy(&output.stderr).into_owned(),
            ),
            Err(err) => (127, String::new(), err.to_string()),
        }
    }

    fn flush(&mut self) {
        let _ = self.stdout.flush();
    }
}

fn text_arg(machine: &Machine, value: Option<&Value>) -> Result<String, Fail> {
    match value {
        Some(Value::Text(units)) => Ok(string(units)),
        Some(other) => defect(format!("expected Text, got {}", machine.show(other))),
        None => defect("expected Text"),
    }
}

fn decoded(bytes: &[u8]) -> Text {
    text(&String::from_utf8_lossy(bytes))
}

/// Runs an `IO` request against the machine's host.
pub fn dispatch(
    machine: &mut Machine,
    ability: &str,
    index: u32,
    args: &[Value],
) -> Result<Value, Fail> {
    if ability != "#IO" {
        return defect(format!("unhandled ability {ability} operation {index}"));
    }
    let op = IO_OPS.get(index as usize).copied().unwrap_or("");
    let io =
        |result: Result<(), String>| result.map_err(|err| Fail::Defect(format!("{op}: {err}")));
    Ok(match op {
        "print" => {
            let chunk = text_arg(machine, args.first())?;
            machine.host.print(&chunk);
            unit()
        }
        "eprint" => {
            let chunk = text_arg(machine, args.first())?;
            machine.host.eprint(&chunk);
            unit()
        }
        "readFile" => {
            let path = text_arg(machine, args.first())?;
            machine
                .host
                .read_file(&path)
                .map_or_else(none, |bytes| some(Value::Text(decoded(&bytes))))
        }
        "writeFile" | "appendFile" => {
            let path = text_arg(machine, args.first())?;
            let content = text_arg(machine, args.get(1))?;
            io(machine
                .host
                .write_file(&path, content.as_bytes(), op == "appendFile"))?;
            unit()
        }
        "exists" => {
            let path = text_arg(machine, args.first())?;
            Value::Bool(machine.host.exists(&path))
        }
        "listDir" => {
            let path = text_arg(machine, args.first())?;
            let mut names: Vec<Text> = machine
                .host
                .list_dir(&path)
                .iter()
                .map(|name| text(name))
                .collect();
            names.sort();
            list_from(names.into_iter().map(Value::Text).collect())
        }
        "mkdirp" => {
            let path = text_arg(machine, args.first())?;
            io(machine.host.mkdirp(&path))?;
            unit()
        }
        "remove" => {
            let path = text_arg(machine, args.first())?;
            machine.host.remove(&path);
            unit()
        }
        "args" => list_from(
            machine
                .host
                .args()
                .iter()
                .map(|arg| Value::Text(text(arg)))
                .collect(),
        ),
        "exit" => {
            machine.host.flush();
            return Err(Fail::Exit(match args.first() {
                Some(Value::Int(code)) => *code,
                _ => 1,
            }));
        }
        "time" => Value::Int(machine.host.time()),
        "readStdin" => Value::Text(text(&machine.host.read_stdin())),
        "writeBytes" => {
            let path = text_arg(machine, args.first())?;
            let bytes: Vec<u8> = list_to(args.get(1).unwrap_or(&nil()))
                .iter()
                .map(|byte| match byte {
                    Value::Int(value) => (*value & 255) as u8,
                    _ => 0,
                })
                .collect();
            io(machine.host.write_file(&path, &bytes, false))?;
            unit()
        }
        "getEnv" => {
            let name = text_arg(machine, args.first())?;
            machine
                .host
                .get_env(&name)
                .map_or_else(none, |value| some(Value::Text(text(&value))))
        }
        "isDir" => {
            let path = text_arg(machine, args.first())?;
            Value::Bool(machine.host.is_dir(&path))
        }
        "wallClock" => Value::Text(text(&machine.host.wall_clock())),
        "exec" => {
            let program = text_arg(machine, args.first())?;
            let argv: Vec<String> = list_to(args.get(1).unwrap_or(&nil()))
                .iter()
                .map(|arg| text_arg(machine, Some(arg)))
                .collect::<Result<_, _>>()?;
            let (code, out, err) = machine.host.exec(&program, &argv);
            pair(
                Value::Int(code),
                pair(Value::Text(text(&out)), Value::Text(text(&err))),
            )
        }
        _ => return defect(format!("unknown IO operation {index}")),
    })
}
