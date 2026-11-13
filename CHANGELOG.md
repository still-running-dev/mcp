# Changelog

## 0.1.2

Engine pinned to `@still-running/health-check` 2.3.1: a zero-write finding's
"Chain:" now lists its steps in the order a run reaches them, and a published
Make template keeps its name instead of "Untitled scenario".

**Fixed:** a client that disconnected while a response was being written
crashed the server with an unhandled `EPIPE` error and a stack trace. It now
exits quietly with code 0.

**Fixed:** `analyze_workflow` and `compare_workflows` given a string that is
not JSON returned `JSON.parse`'s own message ("Unexpected token 'o', …").
They now say it is not valid JSON and how to export the file.

## 0.1.1

**Fixed:** `npx -y @still-running/mcp` exited without starting a server on
Linux and macOS. npm links a bin into `node_modules/.bin` as a symlink, and
the server only started when the path it was launched from matched its own
real path, which a symlink never does. The bin is now `dist/cli.js`, which
always serves. `node dist/index.js` still serves too, and now also through a
symlinked or linked package directory, since both paths are compared as real
paths.

The version the server reports is read from `package.json` (0.1.0 had it
hardcoded). Engine pinned to `@still-running/health-check` 2.3.0.

## 0.1.0

Initial release. Four tools: `analyze_workflow`, `explain_finding`,
`compare_workflows`, `list_rules`. Stdio transport, for Claude Desktop,
Claude Code, and Cursor. Depends on `@still-running/health-check`, pinned to
an exact published version.
