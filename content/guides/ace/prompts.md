---
description: Prompts are terminal widgets for user input, using the @poppinss/prompts package. They support various types like input, password, and select, and are designed for easy testing integration.
---

# Prompts

This guide covers using prompts within custom commands. You will learn about the following topics:

- Displaying text and password input prompts
- Creating single and multi-select choice lists
- Using confirmation and toggle prompts
- Validating and transforming user input
- Using autocomplete for searchable lists
- Testing commands with prompts

## Overview

Prompts enable interactive command line experiences by allowing users to provide input through intuitive terminal widgets rather than command line arguments or flags. This is particularly useful for commands that need to guide users through multi-step processes, collect sensitive information like passwords, or allow selection from a list of options.

Ace prompts are powered by the [@poppinss/prompts](https://github.com/poppinss/prompts) package, which supports multiple prompt types including text input, password fields, confirmations, single and multi-select lists, and autocomplete searches. All prompts support validation, default values, and transformation of user input before it's returned to your command.

A key feature of Ace prompts is their [testing support](../testing/console_tests.md). When writing tests, you can trap prompts and respond to them programmatically, making it easy to test interactive commands without manual input.

## Displaying text input

The text input prompt accepts free-form text from users. Use the `this.prompt.ask` method to display a text input prompt, providing the prompt message as the first parameter.

```ts title="commands/make_model.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class MakeModelCommand extends BaseCommand {
  static commandName = 'make:model'
  
  async run() {
    /**
     * Ask for the model name
     */
    const modelName = await this.prompt.ask('Enter the model name')
    
    this.logger.info(`Creating model: ${modelName}`)
  }
}
```

### Adding validation

You can validate user input by providing a `validate` function in the options object. The function receives the user's input and should return `true` to accept the value, or an error message string to reject it.

```ts title="commands/make_model.ts"
const modelName = await this.prompt.ask('Enter the model name', {
  validate(value) {
    return value.length > 0
      ? true
      : 'Model name is required'
  }
})
```

If validation fails, the prompt displays the error message and asks for input again until the user provides a valid value.

### Providing default values

Default values appear as suggestions that users can accept by pressing Enter. This is useful for providing common values or sensible defaults.

```ts title="commands/make_model.ts"
const modelName = await this.prompt.ask('Enter the model name', {
  default: 'User'
})
```

## Collecting passwords

The password prompt masks user input in the terminal, replacing each character with an asterisk or bullet point. This is essential for collecting sensitive information like passwords, API keys, or tokens.

Use the `this.prompt.secure` method to display a password prompt.

```ts title="commands/setup.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class SetupCommand extends BaseCommand {
  static commandName = 'setup'
  
  async run() {
    /**
     * Collect the database password securely
     */
    const password = await this.prompt.secure('Enter database password')
    
    this.logger.info('Password collected securely')
  }
}
```

You can add validation to password prompts just like text inputs.

```ts title="commands/setup.ts"
const password = await this.prompt.secure('Enter account password', {
  validate(value) {
    return value.length >= 8
      ? true
      : 'Password must be at least 8 characters long'
  }
})
```

## Creating choice lists

The choice prompt displays a list of options that users can navigate with arrow keys and select with Enter. This is ideal when you need users to pick from predefined options.

Use the `this.prompt.choice` method to display a single-select list. The method accepts the prompt message as the first parameter and an array of choices as the second parameter.

```ts title="commands/configure.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class ConfigureCommand extends BaseCommand {
  static commandName = 'configure'
  
  async run() {
    /**
     * Let the user select their package manager
     */
    const packageManager = await this.prompt.choice('Select package manager', [
      'npm',
      'yarn',
      'pnpm'
    ])
    
    this.logger.info(`Using ${packageManager}`)
  }
}
```

### Customizing choice display

When you want the displayed text to differ from the returned value, define choices as objects with `name` and `message` properties. The `name` is what your command receives, while the `message` is what users see.

```ts title="commands/configure.ts"
const driver = await this.prompt.choice('Select database driver', [
  {
    name: 'sqlite',
    message: 'SQLite'
  },
  {
    name: 'mysql',
    message: 'MySQL'
  },
  {
    name: 'pg',
    message: 'PostgreSQL'
  }
])

this.logger.info(`Selected driver: ${driver}`)
// If user selected "PostgreSQL", driver will be "pg"
```

## Allowing multiple selections

The multi-select prompt lets users select multiple options from a list using the spacebar to toggle selections. This is useful when users need to choose multiple features, packages, or configurations.

Use the `this.prompt.multiple` method to display a multi-select list. The parameters are the same as the choice prompt.

```ts title="commands/install.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class InstallCommand extends BaseCommand {
  static commandName = 'install:packages'
  
  async run() {
    /**
     * Let users select multiple database drivers
     */
    const drivers = await this.prompt.multiple('Select database drivers', [
      {
        name: 'sqlite',
        message: 'SQLite'
      },
      {
        name: 'mysql',
        message: 'MySQL'
      },
      {
        name: 'pg',
        message: 'PostgreSQL'
      }
    ])
    
    this.logger.info(`Installing drivers: ${drivers.join(', ')}`)
  }
}
```

The method returns an array of selected values. Users can select all, some, or none of the options.

## Confirming actions

Confirmation prompts ask users to answer yes or no questions. They're essential for destructive operations or actions that need explicit user consent.

Use the `this.prompt.confirm` method to display a yes/no confirmation. The method returns a boolean value.

```ts title="commands/reset.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class ResetCommand extends BaseCommand {
  static commandName = 'db:reset'
  
  async run() {
    /**
     * Confirm before deleting data
     */
    const shouldDelete = await this.prompt.confirm(
      'Want to delete all files?'
    )
    
    if (shouldDelete) {
      this.logger.warning('Deleting all files...')
      // Perform deletion
    } else {
      this.logger.info('Operation cancelled')
    }
  }
}
```

### Customizing yes/no labels

If you want to customize the yes/no labels to something more contextual, use the `this.prompt.toggle` method. This method accepts an array of two strings for the yes and no labels.

```ts title="commands/reset.ts"
const shouldDelete = await this.prompt.toggle(
  'Want to delete all files?',
  ['Yup', 'Nope']
)

if (shouldDelete) {
  this.logger.warning('Deleting all files...')
}
```

## Using autocomplete

The autocomplete prompt combines selection with search functionality, allowing users to fuzzy search through a large list of options. This is particularly useful when dealing with many choices that would be unwieldy in a standard selection list.

Use the `this.prompt.autocomplete` method to display a searchable list.

```ts title="commands/select_city.ts"
import { BaseCommand } from '@adonisjs/core/ace'

export default class SelectCityCommand extends BaseCommand {
  static commandName = 'select:city'
  
  async run() {
    /**
     * Let users search and select from a large list
     */
    const selectedCity = await this.prompt.autocomplete(
      'Select your city',
      await this.getCitiesList()
    )
    
    this.logger.info(`You selected: ${selectedCity}`)
  }
  
  private async getCitiesList() {
    /**
     * Return a large array of city names
     */
    return [
      'New York',
      'Los Angeles',
      'Chicago',
      'Houston',
      // ... hundreds more cities
    ]
  }
}
```

Users can type to filter the list, and the prompt will show matching options based on fuzzy search.

## Understanding prompt options

All prompt types accept a common set of options through the second parameter. These options allow you to customize prompt behavior, validate input, and transform return values.

| Option | Accepted by | Description |
|--------|-------------|-------------|
| `default` | All prompts | The default value to use when no value is entered. For select, multiselect, and autocomplete prompts, the value must be the choices array index. |
| `name` | All prompts | The unique name for the prompt, useful for identifying prompts in tests. |
| `hint` | All prompts | Hint text to display next to the prompt, providing additional context to users. |
| `result` | All prompts | Transform the prompt return value. The input value depends on the prompt type (e.g., multiselect returns an array of selected choices). |
| `format` | All prompts | Live format the input value as the user types. The formatting is only applied to the CLI output, not the return value. |
| `validate` | All prompts | Validate user input. Return `true` to accept the value, or a string error message to reject it. |
| `limit` | `autocomplete` | Limit the number of options to display. Users will need to scroll to see additional options. |

### Transforming return values

The `result` function transforms the value returned by the prompt. This is useful for converting user input to a different format or type.

```ts title="commands/make_model.ts"
const modelName = await this.prompt.ask('Enter the model name', {
  result(value) {
    /**
     * Convert to PascalCase for class names
     */
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
})
```

### Formatting display values

The `format` function changes how the input appears in the terminal as users type, without affecting the actual return value.

```ts title="commands/configure.ts"
const email = await this.prompt.ask('Enter your email', {
  format(value) {
    /**
     * Display email in lowercase as user types
     */
    return value.toLowerCase()
  }
})
```

### Adding hints

Hints provide additional context or instructions that appear next to the prompt.

```ts title="commands/make_migration.ts"
const tableName = await this.prompt.ask('Enter table name', {
  hint: 'Use plural form (e.g., users, posts)'
})
```
