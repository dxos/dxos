//
// Copyright 2026 DXOS.org
//

//! The standalone web runtime (D57): serves a DEUS handler (`Request -> {Storage, Http, Actors,
//! Alarm, IO} Response`, see `deus-lang/platform/web.deus`) over HTTP/1.1, as the Cloudflare
//! Worker does on workerd. `deus build <handler> --server` appends the handler's image to this
//! kernel with the `DEUSSRV1` trailer.
//!
//! - Objects are named by `?actor=` (default `default`). Each has its own storage, kept as one
//!   file per key under `$DEUS_DATA/<object>/` (default `./deus-data`).
//! - A run suspends on the web abilities, which this loop answers; `IO` is handled natively.
//! - `Actors.call` runs on another kernel from a pool, so a suspended caller keeps its own.
//! - `Alarm.set` schedules an `ALARM /alarm` request, fired between connections.
//! - `Http.fetch` goes through `curl`.
//! - The listener is single-threaded: one request at a time, as a Durable Object serializes
//!   its requests.

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::time::{Duration, Instant};

use crate::host::SystemHost;
use crate::json::decode;
use crate::machine::{Machine, Options};
use crate::sexp::{read_all, Sexp};
use crate::text::{string, text};
use crate::value::{list_from, list_to, none, pair, some, Fail, Value};

const STORAGE: &str = "urn:deus:web:Storage";
const HTTP: &str = "urn:deus:web:Http";
const ACTORS: &str = "urn:deus:web:Actors";
const ALARM: &str = "urn:deus:web:Alarm";
const REQUEST: &str = "urn:deus:web:Request";

/// A request's fields: verb, path with query, body.
type Fields = (String, String, String);

/// A response: status, content, headers.
type Reply = (i32, String, Vec<(String, String)>);

struct Server {
    forms: Vec<Sexp>,
    main: String,
    idle: Vec<Machine>,
    data: String,
    alarms: HashMap<String, Instant>,
    options: Options,
}

impl Server {
    fn machine(&mut self) -> Result<Machine, Fail> {
        if let Some(machine) = self.idle.pop() {
            return Ok(machine);
        }
        let mut host = SystemHost::new(Vec::new());
        host.suspend_user = true;
        let mut machine = Machine::new(crate::prims::create(), Box::new(host), &self.options);
        machine.load(&self.forms)?;
        Ok(machine)
    }

    fn key_path(&self, object: &str, key: &str) -> String {
        let hex: String = key.bytes().map(|byte| format!("{byte:02x}")).collect();
        format!("{}/{}/{}", self.data, hex_name(object), hex)
    }

    /// Runs the handler on `object` with a request; answers its operations until it finishes.
    fn serve(&mut self, object: &str, request: &Fields) -> Reply {
        let mut machine = match self.machine() {
            Ok(machine) => machine,
            Err(fail) => return failure(&fail),
        };
        let argument = format!(
            "{{\"$\":\"{REQUEST}\",\"tag\":0,\"fields\":[{},{},{}]}}",
            crate::json::string(&request.0),
            crate::json::string(&request.1),
            crate::json::string(&request.2)
        );
        let reply = match decode(&argument, &mut machine.symbols, &machine.iris) {
            Err(message) => (500, message, Vec::new()),
            Ok(argument) => {
                let main = self.main.clone();
                let mut result = machine.call(&main, vec![argument]);
                loop {
                    match result {
                        Ok(value) => break response(&value),
                        Err(Fail::Suspend {
                            ability,
                            index,
                            args,
                        }) => {
                            let iri = crate::json::iri_of(&ability, &machine.iris);
                            let answer = self.answer(&mut machine, object, &iri, index, &args);
                            result = match answer {
                                Ok(value) => machine.resume(value),
                                Err(message) => Err(Fail::Defect(message)),
                            };
                        }
                        Err(fail) => break failure(&fail),
                    }
                }
            }
        };
        self.idle.push(machine);
        reply
    }

    fn answer(
        &mut self,
        machine: &mut Machine,
        object: &str,
        iri: &str,
        index: u32,
        args: &[Value],
    ) -> Result<Value, String> {
        let text_of = |value: &Value| match value {
            Value::Text(t) => Ok(string(t)),
            _ => Err("expected text".to_string()),
        };
        match (iri, index) {
            (STORAGE, 0) => {
                let path = self.key_path(object, &text_of(&args[0])?);
                Ok(match std::fs::read(&path) {
                    Ok(bytes) => some(Value::Text(text(&String::from_utf8_lossy(&bytes)))),
                    Err(_) => none(),
                })
            }
            (STORAGE, 1) => {
                let path = self.key_path(object, &text_of(&args[0])?);
                if let Some(dir) = std::path::Path::new(&path).parent() {
                    std::fs::create_dir_all(dir).map_err(|err| err.to_string())?;
                }
                std::fs::write(&path, text_of(&args[1])?).map_err(|err| err.to_string())?;
                Ok(crate::value::unit())
            }
            (STORAGE, 2) => {
                let path = self.key_path(object, &text_of(&args[0])?);
                Ok(Value::Bool(std::fs::remove_file(path).is_ok()))
            }
            (ACTORS, 0) => {
                let other = text_of(&args[0])?;
                let request = request_fields(&args[1])?;
                let (status, content, headers) = self.serve(&other, &request);
                Ok(response_value(machine, status, &content, &headers))
            }
            (ALARM, 0) => {
                // A `Duration` (whole seconds, then milliseconds), or bare milliseconds from images built before it.
                let delay = match &args[0] {
                    Value::Int(ms) => i64::from(*ms),
                    Value::Con(con) => match (con.fields.first(), con.fields.get(1)) {
                        (Some(Value::Int(seconds)), Some(Value::Int(millis))) => {
                            i64::from(*seconds) * 1000 + i64::from(*millis)
                        }
                        _ => return Err("Alarm.set expects a Duration".into()),
                    },
                    _ => return Err("Alarm.set expects a Duration".into()),
                }
                .max(0) as u64;
                self.alarms.insert(
                    object.to_string(),
                    Instant::now() + Duration::from_millis(delay),
                );
                Ok(crate::value::unit())
            }
            (HTTP, 0) => {
                let (verb, url, body) = request_fields(&args[0])?;
                let output = std::process::Command::new("curl")
                    .args([
                        "-sS",
                        "-X",
                        &verb,
                        "--data-binary",
                        &body,
                        "-w",
                        "\n%{http_code}",
                        &url,
                    ])
                    .output();
                let (status, content) = match output {
                    Ok(output) => {
                        let out = String::from_utf8_lossy(&output.stdout).into_owned();
                        match out.rsplit_once('\n') {
                            Some((content, code)) => {
                                (code.trim().parse().unwrap_or(502), content.to_string())
                            }
                            None => (502, out),
                        }
                    }
                    Err(err) => (502, err.to_string()),
                };
                Ok(response_value(machine, status, &content, &[]))
            }
            _ => Err(format!(
                "the server does not provide {iri} operation {index}"
            )),
        }
    }

    fn fire_alarms(&mut self) {
        let now = Instant::now();
        let mut due: Vec<String> = self
            .alarms
            .iter()
            .filter(|(_, at)| **at <= now)
            .map(|(object, _)| object.clone())
            .collect();
        due.sort();
        for object in due {
            self.alarms.remove(&object);
            let request = ("ALARM".to_string(), "/alarm".to_string(), String::new());
            self.serve(&object, &request);
            eprintln!("alarm fired for {object}");
        }
    }
}

/// Object names as file names.
fn hex_name(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c.to_string()
            } else {
                format!("%{:02x}", c as u32)
            }
        })
        .collect()
}

fn failure(fail: &Fail) -> Reply {
    let message = match fail {
        Fail::Defect(message) | Fail::Budget(message) => format!("defect: {message}"),
        Fail::Panic(message) => format!("panic: {message}"),
        Fail::Exit(code) => format!("exit {code}"),
        Fail::Suspend { ability, index, .. } => format!("unhandled {ability} operation {index}"),
    };
    (500, message, Vec::new())
}

fn request_fields(value: &Value) -> Result<Fields, String> {
    match value {
        Value::Con(con) if con.fields.len() >= 3 => {
            let field = |i: usize| match &con.fields[i] {
                Value::Text(t) => string(t),
                _ => String::new(),
            };
            Ok((field(0), field(1), field(2)))
        }
        _ => Err("expected a Request".into()),
    }
}

/// A `Response` value of this image's `Response` type.
fn response_value(
    machine: &mut Machine,
    status: i32,
    content: &str,
    headers: &[(String, String)],
) -> Value {
    let headers = list_from(
        headers
            .iter()
            .map(|(k, v)| pair(Value::Text(text(k)), Value::Text(text(v))))
            .collect(),
    );
    let json = format!(
        "{{\"$\":\"urn:deus:web:Response\",\"tag\":0,\"fields\":[{status},{},[]]}}",
        crate::json::string(content)
    );
    match decode(&json, &mut machine.symbols, &machine.iris) {
        Ok(Value::Con(con)) => {
            let mut fields = con.fields.clone();
            if fields.len() >= 3 {
                fields[2] = headers;
            }
            crate::value::con(con.ty, con.tag, fields)
        }
        Ok(other) => other,
        Err(_) => crate::value::unit(),
    }
}

fn response(value: &Value) -> Reply {
    match value {
        Value::Con(con) if con.fields.len() >= 2 => {
            let status = match con.fields[0] {
                Value::Int(code) => code,
                _ => 500,
            };
            let content = match &con.fields[1] {
                Value::Text(t) => string(t),
                _ => String::new(),
            };
            let headers = con
                .fields
                .get(2)
                .map(|list| {
                    list_to(list)
                        .iter()
                        .filter_map(|item| match item {
                            Value::Con(p) if p.fields.len() == 2 => {
                                match (&p.fields[0], &p.fields[1]) {
                                    (Value::Text(k), Value::Text(v)) => {
                                        Some((string(k), string(v)))
                                    }
                                    _ => None,
                                }
                            }
                            _ => None,
                        })
                        .collect()
                })
                .unwrap_or_default();
            (status, content, headers)
        }
        _ => (
            500,
            "the handler did not return a Response".into(),
            Vec::new(),
        ),
    }
}

fn reason(status: i32) -> &'static str {
    match status {
        200 => "OK",
        201 => "Created",
        204 => "No Content",
        301 => "Moved Permanently",
        302 => "Found",
        400 => "Bad Request",
        404 => "Not Found",
        500 => "Internal Server Error",
        503 => "Service Unavailable",
        _ => "Status",
    }
}

/// Reads one HTTP/1.1 request: (verb, path with query, body).
fn read_request(stream: &TcpStream) -> Option<Fields> {
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader.read_line(&mut line).ok()?;
    let mut parts = line.split_whitespace();
    let verb = parts.next()?.to_string();
    let target = parts.next()?.to_string();
    let mut length = 0usize;
    loop {
        let mut header = String::new();
        if reader.read_line(&mut header).ok()? == 0 || header.trim().is_empty() {
            break;
        }
        if let Some((name, value)) = header.split_once(':') {
            if name.trim().eq_ignore_ascii_case("content-length") {
                length = value.trim().parse().unwrap_or(0);
            }
        }
    }
    let mut body = vec![0u8; length];
    reader.read_exact(&mut body).ok()?;
    Some((verb, target, String::from_utf8_lossy(&body).into_owned()))
}

/// Splits `?actor=name` (the object) out of a path; the rest of the query stays.
fn route(target: &str) -> (String, String) {
    let Some((path, query)) = target.split_once('?') else {
        return ("default".into(), target.into());
    };
    let mut object = "default".to_string();
    let rest: Vec<&str> = query
        .split('&')
        .filter(|part| match part.strip_prefix("actor=") {
            Some(name) => {
                object = name.to_string();
                false
            }
            None => !part.is_empty(),
        })
        .collect();
    let path = if rest.is_empty() {
        path.to_string()
    } else {
        format!("{path}?{}", rest.join("&"))
    };
    (object, path)
}

/// Serves `image` on `$PORT` (default 8080) until the process is stopped.
pub fn serve(image: &str) -> i32 {
    let forms = match read_all(&text(image)) {
        Ok(forms) => forms,
        Err(err) => {
            eprintln!("panic: malformed image: {err}");
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
        eprintln!("panic: malformed image: no (main \"hash\") form");
        return 71;
    };
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".into());
    let listener = match TcpListener::bind(format!("127.0.0.1:{port}")) {
        Ok(listener) => listener,
        Err(err) => {
            eprintln!("cannot listen on port {port}: {err}");
            return 1;
        }
    };
    let _ = listener.set_nonblocking(true);
    let mut server = Server {
        forms,
        main,
        idle: Vec::new(),
        data: std::env::var("DEUS_DATA").unwrap_or_else(|_| "deus-data".into()),
        alarms: HashMap::new(),
        options: Options::default(),
    };
    eprintln!("serving on http://127.0.0.1:{port}");
    loop {
        match listener.accept() {
            Ok((stream, _)) => {
                let _ = stream.set_nonblocking(false);
                if let Some((verb, target, body)) = read_request(&stream) {
                    let (object, path) = route(&target);
                    let (status, content, headers) = server.serve(&object, &(verb, path, body));
                    let mut head = format!("HTTP/1.1 {status} {}\r\n", reason(status));
                    let has_type = headers
                        .iter()
                        .any(|(k, _)| k.eq_ignore_ascii_case("content-type"));
                    for (name, value) in &headers {
                        head.push_str(&format!("{name}: {value}\r\n"));
                    }
                    if !has_type {
                        head.push_str("content-type: text/plain; charset=utf-8\r\n");
                    }
                    head.push_str(&format!(
                        "content-length: {}\r\nconnection: close\r\n\r\n",
                        content.len()
                    ));
                    let mut stream = stream;
                    let _ = stream.write_all(head.as_bytes());
                    let _ = stream.write_all(content.as_bytes());
                }
            }
            Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(5));
            }
            Err(err) => eprintln!("accept: {err}"),
        }
        server.fire_alarms();
    }
}
