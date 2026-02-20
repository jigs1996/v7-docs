---
description: Learn how to create custom Ace commands in AdonisJS
---

# Creating commands

This guide covers creating commands using the Ace command line. You will learn about the following topics:

- Creating custom commands
- Configuring command metadata
- Using lifecycle methods
- Injecting dependencies
- Handling errors
- Managing long-running processes

## Creating your first command

You can generate a new command using the `make:command` Ace command. This creates a basic command (within the `commands` directory) scaffolded with all the necessary boilerplate.

See also: [Make command](../../reference/commands.md)

```sh
node ace make:command greet

# CREATE: commands/greet.ts
```

The generated file contains a command class that extends `BaseCommand`. At minimum, a command must define a `commandName` and implement the `run` method.

```ts title="commands/greet.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class GreetCommand extends BaseCommand {
  static commandName = 'greet'
  static description = 'Greet a user by name'

  async run() {
    this.logger.info('Hello world!')
  }
}
```

You can now execute your command using the command name you defined.

```sh
node ace greet
```

## Configuring command metadata

Command metadata controls how your command appears in help screens and how it behaves during execution. The metadata includes the command name, description, help text, aliases, and execution options.

### Setting the command name

The `commandName` property defines the name users will type to execute your command. Command names should not contain spaces and should avoid unfamiliar special characters like `*`, `&`, or slashes.

```ts title="commands/greet.ts"
export default class GreetCommand extends BaseCommand {
  static commandName = 'greet'
}
```

Command names can include namespaces by using a colon separator. This helps organize related commands together in the help output.

```ts title="commands/make/controller.ts"
export default class MakeControllerCommand extends BaseCommand {
  /**
   * The command appears under the "make" namespace
   */
  static commandName = 'make:controller'
}
```

### Writing command descriptions

The command description appears in the commands list and on the help screen for your command. Keep descriptions concise and use the help text for longer explanations.

```ts title="commands/greet.ts"
export default class GreetCommand extends BaseCommand {
  static commandName = 'greet'
  static description = 'Greet a user by name'
}
```

### Adding detailed help text

Help text allows you to provide longer descriptions, usage examples, or additional context that doesn't fit in the brief description. Define help text as an array of strings, where each string represents a line of output.

```ts title="commands/greet.ts"
export default class GreetCommand extends BaseCommand {
  static commandName = 'greet'
  static description = 'Greet a user by name'
  
  static help = [
    'The greet command is used to greet a user by name',
    '',
    'You can also send flowers to a user, if they have an updated address',
    '{{ binaryName }} greet --send-flowers',
  ]
}
```

The `{{ binaryName }}` variable substitution references the binary used to execute ace commands (typically `node ace`), ensuring your help text displays the correct command syntax regardless of how the user runs Ace.

### Defining command aliases

Aliases provide alternative names for your command. This is useful when you want to offer shorter or more intuitive names for frequently used commands.

```ts title="commands/greet.ts"
export default class GreetCommand extends BaseCommand {
  static commandName = 'greet'
  static aliases = ['welcome', 'sayhi']
}
```

Users can now run your command using any of the defined names.

```sh
node ace greet
node ace welcome  
node ace sayhi
```

## Configuring command options

Command options control the execution behavior of your command. These options are defined using the static `options` property and affect how Ace boots the application, handles flags, and manages the command's lifecycle.

```ts title="commands/greet.ts"
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class GreetCommand extends BaseCommand {
  static commandName = 'greet'
  
  static options: CommandOptions = {
    startApp: false,
    allowUnknownFlags: false,
    staysAlive: false,
  }
}
```

### Starting the application

By default, Ace does not boot your AdonisJS application when running commands. This keeps commands fast and prevents unnecessary application initialization for simple tasks that don't need application state.

However, if your command needs access to models, services, or other application resources, you must tell Ace to start the app before executing the command.

```ts title="commands/send_email.ts"
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class SendEmailCommand extends BaseCommand {
  static options: CommandOptions = {
    /**
     * Start the app to access models and services
     */
    startApp: true
  }
  
  async run() {
    /**
     * Can now use application resources like models
     */
    const users = await User.all()
  }
}
```

### Allowing unknown flags

By default, Ace will display an error if you pass a flag that the command doesn't define. This strict parsing helps catch typos and incorrect flag usage.

However, some commands need to accept arbitrary flags and pass them to other tools. You can disable strict flag parsing using the `allowUnknownFlags` option.

```ts title="commands/proxy.ts"
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class ProxyCommand extends BaseCommand {
  static options: CommandOptions = {
    /**
     * Accept any flags and pass them to external tools
     */
    allowUnknownFlags: true
  }
}
```

### Creating long-running commands

Ace automatically terminates the application after your command's `run` method completes. This is the desired behavior for most commands that perform a task and exit.

However, if your command needs to run indefinitely (like a queue worker or development server), you must tell Ace not to terminate the application using the `staysAlive` option.

```ts title="commands/queue_worker.ts"
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class QueueWorkerCommand extends BaseCommand {
  static options: CommandOptions = {
    startApp: true,
    /**
     * Keep the process alive
     */
    staysAlive: true
  }
  
  async run() {
    /**
     * Start processing jobs indefinitely
     */
    await this.startJobProcessor()
  }
}
```

See also: [Terminating the application](#terminating-the-application) and [Cleaning up before termination](#cleaning-up-before-the-app-terminates)

## Understanding command lifecycle

Ace executes command lifecycle methods in a predefined order, allowing you to organize your command logic into distinct phases. Each lifecycle method serves a specific purpose in the command execution flow.

```ts title="commands/greet.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class GreetCommand extends BaseCommand {
  /**
   * Runs first - set up initial state
   */
  async prepare() {
    console.log('preparing')
  }

  /**
   * Runs second - interact with the user
   */
  async interact() {
    console.log('interacting')
  }
  
  /**
   * Runs third - execute main command logic
   */
  async run() {
    console.log('running')
  }

  /**
   * Runs last - cleanup and error handling
   */
  async completed() {
    console.log('completed')
  }
}
```

The following table describes each lifecycle method and its intended use:

| Method | Description |
|--------|-------------|
| `prepare` | The first method Ace executes. Use this to initialize state or data needed by subsequent methods. |
| `interact` | Executed after `prepare`. Use this to display prompts and collect user input. |
| `run` | The command's main logic. This method is called after `interact`. |
| `completed` | Called after all other lifecycle methods. Use this to perform cleanup or handle errors from previous methods. |

You don't need to implement all lifecycle methods. Only define the methods your command actually needs. For simple commands, implementing just the `run` method is sufficient.

## Using dependency injection

Ace constructs and executes commands using the [IoC container](../concepts/dependency_injection.md), enabling you to inject dependencies into any lifecycle method. This is particularly useful for accessing services, repositories, or other resources your command needs.

To inject dependencies, type-hint them as method parameters and decorate the method with the `@inject` decorator.

```ts title="commands/greet.ts"
import { inject } from '@adonisjs/core'
import { BaseCommand } from '@adonisjs/core/ace'
import UserService from '#services/user_service'

export default class GreetCommand extends BaseCommand {
  /**
   * Inject UserService into the prepare method
   */
  @inject()
  async prepare(userService: UserService) {
    // Use the injected service
  }

  /**
   * Dependencies can be injected into any lifecycle method
   */
  @inject()
  async interact(userService: UserService) {
  }
  
  @inject()
  async run(userService: UserService) {
  }

  @inject()
  async completed(userService: UserService) {
  }
}
```

The container automatically resolves dependencies, including nested dependencies, making it easy to access your application's services without manual instantiation.

## Handling errors and exit codes

When an exception is thrown from your command, Ace displays the error using the CLI logger and sets the command's exit code to `1`, indicating failure. A non-zero exit code signals to the shell or CI/CD system that the command failed.

However, you can also handle errors explicitly using try/catch blocks or the `completed` lifecycle method. When handling errors yourself, you must update the command's `exitCode` and `error` properties to ensure the command reports its status correctly.

### Handling errors with try/catch

Use try/catch blocks to handle errors directly in the method where they might occur. This gives you fine-grained control over error handling.

```ts title="commands/greet.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class GreetCommand extends BaseCommand {
  async run() {
    try {
      await runSomeOperation()
    } catch (error) {
      /**
       * Log the error message
       */
      this.logger.error(error.message)
      
      /**
       * Update command state to indicate failure
       */
      this.error = error
      this.exitCode = 1
    }
  }
}
```

### Handling errors in the completed method

The `completed` lifecycle method provides a centralized place to handle errors from any previous lifecycle method. This is useful when you want consistent error handling across all command phases.

```ts title="commands/greet.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class GreetCommand extends BaseCommand {
  async run() {
    /**
     * If this throws, the error will be available in completed()
     */
    await runSomeOperation()
  }
  
  async completed() {
    if (this.error) {
      /**
       * Handle the error from any lifecycle method
       */
      this.logger.error(this.error.message)
      
      /**
       * Return true to notify Ace that you've handled the error
       * This prevents Ace from logging the error again
       */
      return true
    }
  }
}
```

## Terminating the application

Ace automatically terminates the application after executing your command. However, when you enable the `staysAlive` option for long-running commands, you must explicitly terminate the application when your command is done or when an error occurs.

Use the `this.terminate` method to shut down the application gracefully. This is commonly used in long-running processes that need to exit based on specific conditions.

```ts title="commands/monitor_redis.ts"
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class MonitorRedisCommand extends BaseCommand {
  static options: CommandOptions = {
    startApp: true,
    staysAlive: true
  }
  
  async run() {
    const redis = createRedisConnection()
    
    /**
     * Terminate the application when the connection fails
     */
    redis.on('error', (error) => {
      this.logger.error(error)
      this.terminate()
    })
    
    /**
     * Start monitoring Redis
     */
    redis.monitor()
  }
}
```

## Cleaning up before the app terminates

Multiple events can trigger application termination, including the [`SIGTERM` signal](https://www.howtogeek.com/devops/linux-signals-hacks-definition-and-more/) sent by process managers or when the user presses Ctrl+C. To ensure your command performs necessary cleanup before shutdown, listen for the `terminating` hook.

The `terminating` hook should be registered in the `prepare` lifecycle method, which runs before your command's main logic. This ensures the cleanup handler is in place before any work begins.

```ts title="commands/queue_worker.ts"
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class QueueWorkerCommand extends BaseCommand {
  static options: CommandOptions = {
    startApp: true,
    staysAlive: true
  }
  
  prepare() {
    /**
     * Register cleanup logic that runs before termination
     */
    this.app.terminating(() => {
      /**
       * Close database connections, flush logs, etc.
       */
      this.logger.info('Shutting down gracefully...')
    })
  }
  
  async run() {
    /**
     * Start long-running work
     */
    await this.processJobs()
  }
}
```
