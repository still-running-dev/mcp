# Changelog

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
