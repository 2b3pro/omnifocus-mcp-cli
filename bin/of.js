#!/usr/bin/env node

/**
 * OmniFocus CLI Entry Point
 *
 * A command-line interface for OmniFocus 4 on macOS.
 *
 * Usage:
 *   ofocus list inbox
 *   ofocus add "Buy groceries" --project "Errands" --due tomorrow
 *   ofocus complete <taskId>
 *   ofocus search "meeting"
 *
 * Run `ofocus --help` for full command list.
 */

import { createProgram } from '../src/index.js';

// Check platform
if (process.platform !== 'darwin') {
  console.error('Error: OmniFocus CLI only works on macOS.');
  process.exit(1);
}

// Create and run program
const program = createProgram();

// Handle errors gracefully
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (err) {
  if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
    process.exit(0);
  }
  if (err.code === 'commander.missingArgument' || err.code === 'commander.missingMandatoryOptionValue') {
    // Commander already printed the error
    process.exit(1);
  }
  if (err.code === 'OMNIFOCUS_NOT_RUNNING') {
    console.error(err.message);
    process.exit(1);
  }
  // Unexpected error
  console.error('Error:', err.message);
  process.exit(1);
}
