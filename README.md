# @still-running/mcp

An MCP server that puts [stillrunning.dev](https://stillrunning.dev)'s workflow-analysis engine inside the tool you're already using to build or debug an n8n workflow or Make scenario — Claude Desktop, Claude Code, or Cursor.

The analysis itself is [`@still-running/health-check`](https://www.npmjs.com/package/@still-running/health-check), pinned to an exact published version: static analysis of the exported workflow JSON, no execution, no network call, no storage. Same zero-network rule as the `still-running` CLI that package ships — this server just puts an MCP tool interface on top of the same engine, plus a couple of tools (`explain_finding`, `compare_workflows`, `list_rules`) that only make sense in an interactive, conversational tool.

## Tools

### `analyze_workflow`

Checks an n8n workflow or Make blueprint export for silent-failure risks. Takes `workflow` (a JSON string or an already-parsed object — either the whole exported file). Returns the full `AnalysisResult`: findings, what's protecting the workflow already, and a few counters.

### `explain_finding`

Explains one of the four check types in general — what it looks for, why it matters, its severity range, known limitations. Takes `checkId` (the same string every finding from `analyze_workflow` carries: `zero-write`, `credential-expiry`, `no-cadence`, or `error-handling`). A finding's own `ifItGoesQuiet`/`detail`/`howToCheck` fields already explain that specific instance — this is for the check's general methodology instead.

### `compare_workflows`

Runs `analyze_workflow` on two versions of the same workflow (e.g. before/after a fix) and reports which findings were added, removed, unchanged, or changed severity. Takes `before` and `after`, same shape as `analyze_workflow`'s `workflow` argument. Findings are matched by check + node — documented as a heuristic in the tool's own output, not oversold as a perfect diff.

### `list_rules`

Lists every check and every "protection" (the positive-signal side of the same analysis) the engine recognizes, with no input needed. Useful context to pull once at the start of a conversation rather than calling `explain_finding` four times.

## Setup

Requires Node.js 18 or later. Every client below runs the server the same way — `npx -y @still-running/mcp` — Claude Desktop, Claude Code, and Cursor each just need to be told to run that command over stdio.

### Claude Desktop

Edit your config file — quit Claude Desktop fully and reopen it afterward, a reload isn't enough:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "still-running": {
      "command": "npx",
      "args": ["-y", "@still-running/mcp"]
    }
  }
}
```

### Claude Code

From the CLI, in a project you want it available in:

```bash
claude mcp add still-running -- npx -y @still-running/mcp
```

To make it available in every project instead of just this one, add `--scope user`:

```bash
claude mcp add --scope user still-running -- npx -y @still-running/mcp
```

Or edit the JSON directly — `.mcp.json` in a project root (commit it to share with your team), or `~/.claude.json` for user scope:

```json
{
  "mcpServers": {
    "still-running": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@still-running/mcp"]
    }
  }
}
```

Verify with `claude mcp list`.

### Cursor

Global (all projects), `~/.cursor/mcp.json` — or per-project, `.cursor/mcp.json` in the project root:

```json
{
  "mcpServers": {
    "still-running": {
      "command": "npx",
      "args": ["-y", "@still-running/mcp"]
    }
  }
}
```

## Local development

```
npm install
npm run build
npm run typecheck
npm test
```

`npm run build` compiles `src/` to `dist/` — the published package ships only `dist/` and this README (see `files` in `package.json`).

## Resources

- [stillrunning.dev](https://stillrunning.dev)
- [`@still-running/health-check`](https://www.npmjs.com/package/@still-running/health-check) — the analysis engine this server wraps
- [Model Context Protocol](https://modelcontextprotocol.io)
