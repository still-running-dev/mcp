#!/usr/bin/env node
/**
 * The `still-running-mcp` bin. It always serves, with no "was I the file
 * that started the process?" check: npm links a bin into `node_modules/.bin`,
 * so the path the process starts from is a symlink on Linux and macOS, and
 * that check is what kept 0.1.0 from ever starting under `npx`.
 */
import { serveStdio } from './index.js';

serveStdio();
