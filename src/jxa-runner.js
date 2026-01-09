/**
 * JXA Script Runner
 * Executes JXA scripts via osascript and returns parsed JSON results
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const JXA_DIR = resolve(__dirname, '..', 'jxa');

/**
 * Run a JXA script and return the parsed JSON result
 * @param {string} category - Script category (read, write, utils)
 * @param {string} scriptName - Script filename (without .js)
 * @param {string[]} args - Arguments to pass to the script
 * @returns {Promise<object>} Parsed JSON response
 */
export async function runJxa(category, scriptName, args = []) {
  const scriptPath = resolve(JXA_DIR, category, `${scriptName}.js`);
  const helpersPath = resolve(JXA_DIR, 'utils', 'helpers.js');

  try {
    const [scriptContent, helpersContent] = await Promise.all([
      readFile(scriptPath, 'utf8'),
      readFile(helpersPath, 'utf8')
    ]);

    const cleanHelpers = helpersContent.replace(/^(?:(?:\/\/.*|\s*)\r?\n)+/, '');
    const cleanScript = scriptContent.replace(/^#!.*\r?\n/, '');

    // Combine helpers and script
    const fullScript = `${cleanHelpers}\n${cleanScript}`;

    const { stdout, stderr } = await execFileAsync(
      'osascript',
      ['-l', 'JavaScript', '-e', fullScript, '--', ...args],
      {
        timeout: 60000, // 60 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    // Parse JSON output
    const trimmed = stdout.trim();
    if (!trimmed) {
      return { success: false, error: 'Empty response from script' };
    }

    try {
      return JSON.parse(trimmed);
    } catch (parseError) {
      return { success: true, raw: trimmed };
    }
  } catch (error) {
    if (error.killed) {
      return { success: false, error: 'Script timed out' };
    }
    if (error.code === 'ENOENT') {
      return { success: false, error: `Script not found: ${scriptPath}` };
    }

    if (error.stdout) {
      try {
        return JSON.parse(error.stdout.trim());
      } catch {
        // Fall through
      }
    }

    return {
      success: false,
      error: error.message || 'Unknown error',
      stderr: error.stderr?.trim() || undefined
    };
  }
}

/**
 * Check if OmniFocus is running
 * @returns {Promise<boolean>}
 */
export async function isOmniFocusRunning() {
  const scriptPath = resolve(JXA_DIR, 'utils', 'isRunning.js');
  try {
    const scriptContent = await readFile(scriptPath, 'utf8');
    const { stdout } = await execFileAsync(
      'osascript',
      ['-l', 'JavaScript', '-e', scriptContent],
      { timeout: 5000 }
    );
    const trimmed = stdout.trim();
    if (!trimmed) return false;
    const result = JSON.parse(trimmed);
    return result.success && result.running === true;
  } catch (error) {
    return false;
  }
}

/**
 * Ensure OmniFocus is running before executing a command
 * @returns {Promise<void>}
 * @throws {Error} if OmniFocus is not running
 */
export async function requireOmniFocus() {
  const running = await isOmniFocusRunning();
  if (!running) {
    const error = new Error('OmniFocus is not running. Please launch OmniFocus and try again.');
    error.code = 'OMNIFOCUS_NOT_RUNNING';
    throw error;
  }
}

/**
 * Run AppleScript directly (for operations not supported in JXA)
 * @param {string} script - AppleScript to execute
 * @returns {Promise<string>} Output from script
 */
export async function runAppleScript(script) {
  try {
    const { stdout } = await execFileAsync(
      'osascript',
      ['-e', script],
      { timeout: 60000 }
    );
    return stdout.trim();
  } catch (error) {
    throw new Error(error.stderr?.trim() || error.message);
  }
}
