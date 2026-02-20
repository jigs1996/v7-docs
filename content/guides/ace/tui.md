---
description: Ace Terminal UI utilizes the @poppinss/cliui package, offering tools to display logs, tables, and animations. Designed for testing, it includes a 'raw' mode to simplify log collection and assertions.
---

# Terminal UI

This guide covers different aspects of Terminal UIs. You will learn about the following topics:

- Displaying log messages with different severity levels
- Adding loading animations and action indicators
- Formatting text with colors
- Rendering tables with custom alignment
- Creating boxed content with stickers
- Building animated task runners with progress updates

## Overview

The Ace terminal UI is powered by the [@poppinss/cliui](https://github.com/poppinss/cliui) package, which provides helpers for displaying logs, rendering tables, showing animated tasks, and more. 

All terminal UI primitives are built with testing in mind. When writing tests, you can enable "raw" mode to disable colors and formatting, making it easy to collect logs in memory and write assertions against them. This design ensures your commands remain testable while delivering rich visual experiences to users.

## Displaying log messages

The CLI logger provides methods for displaying messages at different severity levels. Each log level uses distinct colors and icons to help users quickly identify message importance.

```ts title="commands/deploy.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class DeployCommand extends BaseCommand {
  static commandName = 'deploy'
  
  async run() {
    /**
     * Debug message - helpful for troubleshooting
     */
    this.logger.debug('Loading deployment configuration')
    
    /**
     * Info message - general information
     */
    this.logger.info('Deploying application to production')
    
    /**
     * Success message - operation completed successfully
     */
    this.logger.success('Deployment completed successfully')
    
    /**
     * Warning message - potential issues
     */
    this.logger.warning('SSL certificate expires in 30 days')
    
    /**
     * Error and fatal messages - written to stderr
     */
    this.logger.error(new Error('Failed to upload assets'))
    this.logger.fatal(new Error('Deployment failed completely'))
  }
}
```

The `error` and `fatal` methods write to stderr rather than stdout, making it easier for users to redirect error output separately from normal output.

### Adding prefix and suffix

You can add prefix and suffix text to log messages for additional context. Both prefix and suffix are displayed with reduced opacity to distinguish them from the main message.

```ts title="commands/install.ts"
/**
 * Add a suffix showing the command being run
 */
this.logger.info('Installing packages', {
  suffix: 'npm i --production'
})

/**
 * Add a prefix showing the process ID
 */
this.logger.info('Starting worker', {
  prefix: process.pid
})
```

### Creating loading animations

Loading animations display animated dots after a message, providing visual feedback during long-running operations. You can update the message text and stop the animation when the operation completes.

```ts title="commands/build.ts"
/**
 * Create a loading animation
 */
const animation = this.logger.await('Installing packages', {
  suffix: 'npm i'
})

/**
 * Start the animation
 */
animation.start()

/**
 * Update the message as progress continues
 */
setTimeout(() => {
  animation.update('Unpacking packages', {
    suffix: undefined
  })
}, 2000)

/**
 * Stop the animation when complete
 */
setTimeout(() => {
  animation.stop()
  this.logger.success('Installation complete')
}, 4000)
```

### Displaying action status

Logger actions provide a consistent way to display the status of operations with automatic styling and color coding. This is particularly useful when performing multiple sequential tasks.

```ts title="commands/setup.ts"
/**
 * Create an action indicator
 */
const createFile = this.logger.action('creating config/auth.ts')

try {
  await this.createConfigFile()
  
  /**
   * Mark the action as succeeded
   * Optional: display how long it took
   */
  createFile.displayDuration().succeeded()
} catch (error) {
  /**
   * Mark the action as failed with the error
   */
  createFile.failed(error)
}
```

Actions can be marked with three different states:

```ts title="commands/setup.ts"
/**
 * Operation completed successfully
 */
action.succeeded()

/**
 * Operation was skipped with a reason
 */
action.skipped('File already exists')

/**
 * Operation failed with an error
 */
action.failed(new Error('Permission denied'))
```

## Formatting text with colors

Ace uses [kleur](https://www.npmjs.com/package/kleur) for applying ANSI color codes to text. Access kleur's chained API through the `this.colors` property to format text with foreground colors, background colors, and text styles.

```ts title="commands/status.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class StatusCommand extends BaseCommand {
  static commandName = 'status'
  
  async run() {
    /**
     * Apply foreground colors
     */
    this.logger.info(this.colors.red('[ERROR]'))
    this.logger.info(this.colors.green('[SUCCESS]'))
    this.logger.info(this.colors.yellow('[WARNING]'))
    
    /**
     * Combine background and foreground colors
     */
    this.logger.info(this.colors.bgGreen().white(' CREATED '))
    this.logger.info(this.colors.bgRed().white(' FAILED '))
    
    /**
     * Apply text styles
     */
    this.logger.info(this.colors.bold('Important message'))
    this.logger.info(this.colors.dim('Less important details'))
  }
}
```

## Rendering tables

Tables organize data into rows and columns, making it easy for users to scan and compare information. Create a table using the `this.ui.table` method, which returns a `Table` instance for defining headers and rows.

```ts title="commands/list_migrations.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class ListMigrationsCommand extends BaseCommand {
  static commandName = 'migration:list'
  
  async run() {
    /**
     * Create a new table
     */
    const table = this.ui.table()
    
    /**
     * Define table headers
     */
    table.head([
      'Migration',
      'Duration',
      'Status',
    ])
    
    /**
     * Add table rows
     */
    table.row([
      '1590591892626_tenants.ts',
      '2ms',
      'DONE'
    ])
    
    table.row([
      '1590595949171_entities.ts',
      '2ms',
      'DONE'
    ])
    
    /**
     * Render the table to the terminal
     */
    table.render()
  }
}
```

You can apply color formatting to any table cell by wrapping values with color methods.

```ts title="commands/list_migrations.ts"
table.row([
  '1590595949171_entities.ts',
  '2ms',
  this.colors.green('DONE')
])

table.row([
  '1590595949172_users.ts',
  '5ms',
  this.colors.red('FAILED')
])
```

### Right-aligning columns

By default, all columns are left-aligned. You can right-align columns by defining them as objects with an `hAlign` property. When right-aligning a column, make sure to also right-align the corresponding header.

```ts title="commands/list_migrations.ts"
/**
 * Right-align the status column header
 */
table.head([
  'Migration',
  'Batch',
  {
    content: 'Status',
    hAlign: 'right'
  },
])

/**
 * Right-align the status column data
 */
table.row([
  '1590595949171_entities.ts',
  '2',
  {
    content: this.colors.green('DONE'),
    hAlign: 'right'
  }
])
```

### Rendering full-width tables

By default, tables automatically size columns to fit their content. However, you can render tables at full terminal width using the `fullWidth` method.

In full-width mode, all columns except one use their content width, while the designated "fluid" column expands to fill remaining space. By default, the first column is fluid.

```ts title="commands/list_files.ts"
/**
 * Render table at full terminal width
 */
table.fullWidth().render()
```

You can change which column expands to fill available space using the `fluidColumnIndex` method.

```ts title="commands/list_files.ts"
/**
 * Make the second column (index 1) fluid instead
 */
table
  .fullWidth()
  .fluidColumnIndex(1)
  .render()
```

## Creating boxed content with stickers

Stickers render content inside a bordered box, drawing user attention to important information like server addresses, configuration instructions, or key next steps.

```ts title="commands/serve.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class ServeCommand extends BaseCommand {
  static commandName = 'serve'
  
  async run() {
    /**
     * Create a sticker for displaying server info
     */
    const sticker = this.ui.sticker()

    sticker
      .add('Started HTTP server')
      .add('')
      .add(`Local address:   ${this.colors.cyan('http://localhost:3333')}`)
      .add(`Network address: ${this.colors.cyan('http://192.168.1.2:3333')}`)
      .render()
  }
}
```

For displaying step-by-step instructions, use the `this.ui.instructions` method instead. This prefixes each line with an arrow symbol (`>`), making it clear these are action items.

```ts title="commands/init.ts"
/**
 * Display post-installation instructions
 */
const instructions = this.ui.instructions()

instructions
  .add('Run npm install to install dependencies')
  .add('Copy .env.example to .env and configure your environment')
  .add('Run node ace migrate to set up the database')
  .render()
```

## Building animated task runners

The tasks widget provides a polished UI for executing and displaying progress of multiple time-consuming operations. It supports two rendering modes: minimal (for production use) and verbose (for debugging).

In minimal mode, only the currently running task is expanded to show progress updates. In verbose mode, every progress message is logged on its own line, making it easier to debug issues.

### Creating basic tasks

Create a tasks widget using the `this.ui.tasks` method, then add individual tasks with the `add` method.

```ts title="commands/setup.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class SetupCommand extends BaseCommand {
  static commandName = 'setup'
  
  async run() {
    /**
     * Create a tasks widget
     */
    const tasks = this.ui.tasks()

    /**
     * Add tasks and execute them
     */
    await tasks
      .add('clone repo', async (task) => {
        await this.cloneRepository()
        return 'Completed'
      })
      .add('update package file', async (task) => {
        try {
          await this.updatePackageFile()
          return 'Updated'
        } catch (error) {
          return task.error('Unable to update package file')
        }
      })
      .add('install dependencies', async (task) => {
        await this.installDependencies()
        return 'Installed'
      })
      .run()
  }
}
```

Each task callback must return a status message. Returning a normal string indicates success, while wrapping the return value in `task.error()` indicates failure. You can also throw an exception to mark a task as failed.

### Reporting task progress

Instead of using `console.log` or `this.logger` inside task callbacks, use the `task.update` method to report progress. This ensures progress updates are displayed correctly in both minimal and verbose modes.

```ts title="commands/build.ts"
/**
 * Helper to simulate async work
 */
const sleep = () => new Promise<void>((resolve) => setTimeout(resolve, 50))

const tasks = this.ui.tasks()

await tasks
  .add('clone repo', async (task) => {
    /**
     * Report progress as the task executes
     */
    for (let i = 0; i <= 100; i = i + 2) {
      await sleep()
      task.update(`Downloaded ${i}%`)
    }

    return 'Completed'
  })
  .run()
```

In minimal mode, only the latest progress message is visible. In verbose mode, all messages are logged as they occur.

### Enabling verbose mode

You may want to allow users to enable verbose output for debugging. This is commonly done by accepting a `--verbose` flag.

```ts title="commands/deploy.ts"
import { BaseCommand, flags } from '@adonisjs/core/ace'

export default class DeployCommand extends BaseCommand {
  static commandName = 'deploy'
  
  /**
   * Accept a verbose flag
   */
  @flags.boolean({
    description: 'Enable verbose output'
  })
  declare verbose: boolean

  async run() {
    /**
     * Enable verbose mode based on the flag
     */
    const tasks = this.ui.tasks({
      verbose: this.verbose
    })
    
    await tasks
      .add('build assets', async (task) => {
        // Task implementation
      })
      .run()
  }
}
```

Users can now run your command with `--verbose` to see detailed progress logs for debugging.
