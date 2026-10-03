#!/usr/bin/env node
/**
 * Build step: copy the tracked Python bridge source into its runtime location.
 *
 * `python/gyoshu_bridge.py` is the tracked source (the `bridge/` directory is
 * gitignored build output). The runtime resolves
 * `<package-root>/bridge/gyoshu_bridge.py` (src/tools/python-repl/bridge-manager.ts),
 * so this step materializes the payload there. Idempotent: overwrites only when
 * the content differs.
 */

import { copyFileSync, mkdirSync, readFileSync } from 'fs';
import { dirname } from 'path';

const source = 'python/gyoshu_bridge.py';
const dest = 'bridge/gyoshu_bridge.py';

let needsCopy = true;
try {
  needsCopy = !readFileSync(source).equals(readFileSync(dest));
} catch {
  // destination missing or unreadable -> copy
}

if (needsCopy) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(source, dest);
  console.error(`Copied ${source} -> ${dest}`);
} else {
  console.error(`${dest} already up to date`);
}
