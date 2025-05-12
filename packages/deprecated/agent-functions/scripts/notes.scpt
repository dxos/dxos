# AppleScript to list notes in a given folder.
# NOTE: There is no official Web API for Apple Notes.
# NOTE: Edit with WebStorm AppleScript plugin (attach Dictionary for Notes to inspect properties).
# TODO(burdon): JXAs script to output JSON?
# https://stackoverflow.com/questions/43704434/programmatically-access-apple-notes-contents
# osascript notes.scpt

tell application "Notes"
  tell folder "DXOS"
    repeat with _note in notes
      set _id to id of _note
      set _date to modification date of _note
      set _name to name of _note
      set _content to plaintext of _note

      log "<<<<<<<<<<<<<<<<"
      log _id
      log _date
      log _name
      log "================"
      log _content
      log ">>>>>>>>>>>>>>>>"
      log ""
    end repeat
  end tell
end tell
