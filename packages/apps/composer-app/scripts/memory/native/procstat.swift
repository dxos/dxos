// Prints one JSON object per process the given pid is responsible for (itself included): the
// WebKit helpers are launchd children, so responsibility is the only link back to the app.
// Usage: procstat <app pid>

import Foundation

typealias ResponsibleFn = @convention(c) (pid_t) -> pid_t
guard CommandLine.arguments.count == 2, let root = pid_t(CommandLine.arguments[1]) else {
  FileHandle.standardError.write("usage: procstat <app pid>\n".data(using: .utf8)!)
  exit(2)
}
guard let symbol = dlsym(dlopen(nil, RTLD_NOW), "responsibility_get_pid_responsible_for_pid") else {
  FileHandle.standardError.write("responsibility_get_pid_responsible_for_pid unavailable\n".data(using: .utf8)!)
  exit(3)
}
let responsibleFor = unsafeBitCast(symbol, to: ResponsibleFn.self)

var timebase = mach_timebase_info_data_t()
mach_timebase_info(&timebase)
let nsPerTick = Double(timebase.numer) / Double(timebase.denom)

let count = Int(proc_listallpids(nil, 0))
var pids = [pid_t](repeating: 0, count: count + 64)
let found = Int(proc_listallpids(&pids, Int32(pids.count * MemoryLayout<pid_t>.size)))

var rows: [String] = []
for pid in pids.prefix(found) where pid == root || responsibleFor(pid) == root {
  var info = rusage_info_v4()
  // The C API takes the struct itself cast to `rusage_info_t *`, not a pointer to a pointer.
  let rc = withUnsafeMutablePointer(to: &info) { pointer in
    pointer.withMemoryRebound(to: rusage_info_t?.self, capacity: 1) { proc_pid_rusage(pid, RUSAGE_INFO_V4, $0) }
  }
  if rc != 0 { continue }
  var nameBuffer = [CChar](repeating: 0, count: 4096)
  proc_name(pid, &nameBuffer, UInt32(nameBuffer.count))
  let name = String(cString: nameBuffer)
  let cpuMs = UInt64(Double(info.ri_user_time + info.ri_system_time) * nsPerTick / 1_000_000)
  rows.append(
    "{\"pid\":\(pid),\"name\":\"\(name)\",\"footprint\":\(info.ri_phys_footprint),\"peak\":\(info.ri_lifetime_max_phys_footprint),\"disk_read\":\(info.ri_diskio_bytesread),\"disk_written\":\(info.ri_diskio_byteswritten),\"cpu_ms\":\(cpuMs)}"
  )
}
print("[\(rows.joined(separator: ","))]")
