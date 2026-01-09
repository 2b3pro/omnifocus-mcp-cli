/**
 * OmniFocus CLI
 * Command-line interface for OmniFocus 4
 */

import { Command } from 'commander';
import { registerListCommand } from './commands/list.js';
import { registerGetCommand } from './commands/get.js';
import { registerAddCommand } from './commands/add.js';
import { registerCompleteCommand } from './commands/complete.js';
import { registerModifyCommand } from './commands/modify.js';
import { registerSearchCommand } from './commands/search.js';
import { registerSyncCommand } from './commands/sync.js';
import { registerFolderCommand } from './commands/folder.js';
import { registerProjectCommand } from './commands/project.js';
import { registerTagCommand } from './commands/tag.js';
import { registerReviewCommand } from './commands/review.js';
import { registerMcpCommand } from './commands/mcp.js';

const VERSION = '0.1.0';

export function createProgram() {
  const program = new Command();

  program
    .name('of')
    .description('Command-line interface for OmniFocus 4')
    .version(VERSION, '-v, --version', 'Show version number')
    .configureHelp({
      sortSubcommands: true,
      sortOptions: true
    });

  // Register all commands
  registerListCommand(program);
  registerGetCommand(program);
  registerAddCommand(program);
  registerCompleteCommand(program);
  registerModifyCommand(program);
  registerSearchCommand(program);
  registerSyncCommand(program);
  registerFolderCommand(program);
  registerProjectCommand(program);
  registerTagCommand(program);
  registerReviewCommand(program);
  registerMcpCommand(program);

  // Add completion command
  program
    .command('completion <shell>')
    .description('Generate shell completion script (bash, zsh)')
    .action((shell) => {
      console.log(generateCompletion(shell));
    });

  return program;
}

/**
 * Generate shell completion scripts
 */
function generateCompletion(shell) {
  const commands = ['list', 'get', 'add', 'complete', 'modify', 'search', 'completion'];

  const subcommands = {
    list: ['inbox', 'projects', 'folders', 'tags', 'today', 'flagged', 'forecast'],
    get: ['task', 'project', 'folder', 'tag'],
    add: ['task', 'project'],
    complete: [],
    modify: [],
    search: []
  };

  switch (shell) {
    case 'bash':
      return `# Bash completion for of (OmniFocus CLI)
# Add to ~/.bashrc or ~/.bash_completion

_of_completions() {
    local cur prev commands
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    commands="${commands.join(' ')}"

    case "\${prev}" in
        of)
            COMPREPLY=( $(compgen -W "\${commands}" -- \${cur}) )
            return 0
            ;;
        list|ls)
            COMPREPLY=( $(compgen -W "inbox projects folders tags today flagged forecast" -- \${cur}) )
            return 0
            ;;
        get)
            COMPREPLY=( $(compgen -W "task project folder tag" -- \${cur}) )
            return 0
            ;;
        add)
            COMPREPLY=( $(compgen -W "task project" -- \${cur}) )
            return 0
            ;;
        completion)
            COMPREPLY=( $(compgen -W "bash zsh" -- \${cur}) )
            return 0
            ;;
    esac

    return 0
}

complete -F _of_completions of`;

    case 'zsh':
      return `#compdef of

# Zsh completion for of (OmniFocus CLI)

_of() {
    local -a commands
    commands=(
        'list:List tasks, projects, folders, or tags'
        'get:Get details of a specific item'
        'add:Add a new task or project'
        'complete:Mark items as complete'
        'modify:Modify existing items'
        'search:Search for tasks'
        'completion:Generate shell completion'
    )

    _arguments -C \\
        '1: :->command' \\
        '*: :->args'

    case $state in
        command)
            _describe 'command' commands
            ;;
        args)
            case $words[2] in
                list|ls)
                    _values 'subcommand' inbox projects folders tags today flagged forecast
                    ;;
                get)
                    _values 'subcommand' task project folder tag
                    ;;
                add)
                    _values 'subcommand' task project
                    ;;
                completion)
                    _values 'shell' bash zsh
                    ;;
            esac
            ;;
    esac
}

_of`;

    default:
      return `# Unsupported shell: ${shell}`;
  }
}
