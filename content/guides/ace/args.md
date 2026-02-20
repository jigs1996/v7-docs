---
description: Learn about defining and processing command arguments in Ace commands.
---

# Command arguments

This guide covers defining command arguments within custom commands. You will learn about the following topics:

- Defining positional arguments
- Making arguments optional
- Accepting multiple values
- Transforming argument values

## Overview

Arguments are positional values that users provide after the command name when executing a command. Unlike flags, which can be specified in any order, arguments must be provided in the exact order they are defined in your command class.

For example, in the command `node ace make:controller users --resource`, the word `users` is an argument, while `--resource` is a flag. Arguments are ideal for required input values that have a natural order, such as filenames, resource names, or entity identifiers.

## Defining your first argument

You define command arguments as class properties decorated with the `@args` decorator. Ace will accept arguments in the same order as they appear in your class, making the property order significant.

The most common argument type is a string argument, which accepts any text value. Use the `@args.string` decorator to define string arguments.

```ts title="commands/greet.ts"
import { BaseCommand, args } from '@adonisjs/core/ace'

export default class GreetCommand extends BaseCommand {
  static commandName = 'greet'
  static description = 'Greet a user by name'
  
  /**
   * Define a required string argument
   */
  @args.string()
  declare name: string

  async run() {
    this.logger.info(`Hello, ${this.name}!`)
  }
}
```

Users can now run your command by providing a value for the name argument.

```sh
node ace greet John

# Output: Hello, John!
```

If the user forgets to provide the required argument, Ace will display an error message indicating which argument is missing.

## Accepting multiple values

Some commands need to accept multiple values for a single argument. For example, a command that processes multiple files might accept any number of filenames.

Use the `@args.spread` decorator to accept multiple values. The spread argument must be the last argument in your command, as it captures all remaining values.

```ts title="commands/greet.ts"
import { BaseCommand, args } from '@adonisjs/core/ace'

export default class GreetCommand extends BaseCommand {
  static commandName = 'greet'
  static description = 'Greet multiple users by name'
  
  /**
   * Accept multiple names as an array
   */
  @args.spread()
  declare names: string[]

  async run() {
    this.names.forEach((name) => {
      this.logger.info(`Hello, ${name}!`)
    })
  }
}
```

Users can now provide any number of values when running the command.

```sh
node ace greet John Jane Bob

# Output:
# Hello, John!
# Hello, Jane!
# Hello, Bob!
```

## Customizing argument name and description

The argument name appears in help screens and error messages. By default, Ace uses the dashed-case version of your property name as the argument name. For example, a property named `userName` becomes `user-name` in the help output.

You can customize the argument name using the `argumentName` option.

```ts title="commands/greet.ts"
@args.string({
  argumentName: 'user-name'
})
declare name: string
```

Adding a description helps users understand what value they should provide. The description appears in the help screen when users run `node ace greet --help`.

```ts title="commands/greet.ts"
@args.string({
  argumentName: 'user-name',
  description: 'Name of the user to greet'
})
declare name: string
```

## Making arguments optional

All arguments are required by default, ensuring users provide necessary input before your command executes. However, you can make an argument optional by setting the `required` option to `false`.

Optional arguments must come after all required arguments. This ordering requirement prevents ambiguity in argument parsing.

```ts title="commands/greet.ts"
import { BaseCommand, args } from '@adonisjs/core/ace'

export default class GreetCommand extends BaseCommand {
  static commandName = 'greet'
  
  @args.string({
    description: 'Name of the user to greet'
  })
  declare name: string
  
  /**
   * Optional greeting message with custom wording
   */
  @args.string({
    description: 'Custom greeting message',
    required: false,
  })
  declare message?: string

  async run() {
    const greeting = this.message || 'Hello'
    this.logger.info(`${greeting}, ${this.name}!`)
  }
}
```

Now users can run the command with or without the second argument.

```sh
node ace greet John
# Output: Hello, John!

node ace greet John "Good morning"
# Output: Good morning, John!
```

### Providing default values

You can specify a default value for optional arguments using the `default` property. When users don't provide a value, Ace uses the default instead.

```ts title="commands/greet.ts"
@args.string({
  description: 'Name of the user to greet',
  required: false,
  default: 'guest'
})
declare name: string
```

With a default value, the argument becomes optional but your code can always expect a string value rather than handling undefined.

```sh
node ace greet
# Uses the default value "guest"
# Output: Hello, guest!
```

## Transforming argument values

The `parse` method allows you to transform or validate the argument value before it's assigned to the class property. This is useful for normalizing input, converting types, or performing validation.

The parse method receives the raw string value from the command line and must return the transformed value.

```ts title="commands/greet.ts"
@args.string({
  argumentName: 'user-name',
  description: 'Name of the user to greet',
  parse(value) {
    /**
     * Convert the name to uppercase
     */
    return value ? value.toUpperCase() : value
  }
})
declare name: string
```

Now when users provide a name, it will automatically be converted to uppercase before your command's `run` method executes.

```sh
node ace greet john
# The name is transformed to "JOHN"
# Output: Hello, JOHN!
```

You can also use the parse method for validation by throwing an error when the value is invalid.

```ts title="commands/create_user.ts"
@args.string({
  description: 'Email address of the user',
  parse(value) {
    if (!value.includes('@')) {
      throw new Error('Please provide a valid email address')
    }
    return value.toLowerCase()
  }
})
declare email: string
```

## Accessing all arguments

You can access all arguments provided by the user, including their raw values, using the `this.parsed.args` property. This is useful for debugging or when you need to inspect the complete argument list.

```ts title="commands/greet.ts"
import { BaseCommand, args } from '@adonisjs/core/ace'

export default class GreetCommand extends BaseCommand {
  static commandName = 'greet'
  static description = 'Greet a user by name'
  
  @args.string()
  declare name: string

  async run() {
    /**
     * Access all arguments as a key-value object
     */
    console.log(this.parsed.args)
    // Output: { name: 'John' }
    
    this.logger.info(`Hello, ${this.name}!`)
  }
}
```
