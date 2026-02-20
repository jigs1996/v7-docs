---
description: Learn how to debug AdonisJS applications using VSCode, Node.js inspector, debug logs, and Edge template helpers.
---

# Debugging

This guide covers debugging techniques for AdonisJS applications. You will learn how to:

- Configure VSCode to debug your application with breakpoints
- Use the Node.js inspector from the command line
- View framework-level debug logs with `NODE_DEBUG`
- Inspect variables in Edge templates with `@dump` and `@dd`
- Enable pretty error pages during development

## Overview

Debugging is an essential part of development, and AdonisJS supports multiple approaches depending on your needs. For quick checks, a simple `console.log` statement often suffices. For more complex issues, you can use VSCode's integrated debugger to set breakpoints, step through code, and inspect variables. When you need to understand what's happening inside the framework itself, debug logs provide visibility into AdonisJS internals.

Edge templates have their own debugging tools with `@dump` and `@dd`, which render variable contents directly in the browser. During development, the exception handler automatically displays detailed error pages with stack traces and request information when something goes wrong.

## VSCode debugger

The VSCode debugger provides the most powerful debugging experience, allowing you to set breakpoints, step through code line by line, and inspect the call stack and variables. Use this approach when debugging complex issues that can't be resolved with simple log statements.

Create a `.vscode/launch.json` file in your project root with configurations for the dev server, test runner, and attach mode.

```json title=".vscode/launch.json"
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Dev server",
      "program": "${workspaceFolder}/ace.js",
      "args": ["serve", "--hmr"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Tests",
      "program": "${workspaceFolder}/ace.js",
      "args": ["test", "--watch"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach Program",
      "port": 9229,
      "autoAttachChildProcesses": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

The **Dev server** configuration launches your application with HMR enabled, perfect for debugging HTTP request handling, middleware, and controllers. The **Tests** configuration runs your test suite in watch mode, allowing you to debug failing tests by setting breakpoints in your test files or application code.

### Debugging Ace commands

The [**Attach Program**](https://code.visualstudio.com/blogs/2018/07/12/introducing-logpoints-and-auto-attach#_autoattaching-to-node-processes) configuration uses attach mode instead of launching a specific command. This lets you debug any Ace command by starting it with the `--inspect` flag and then attaching the debugger.

To debug an Ace command:

1. Open the Command Palette with `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Search for **Debug: Select and Start Debugging**
3. Select the **Attach Program** option
4. Run your Ace command with the `--inspect` flag.

```bash
node --inspect ace migration:run
```

The debugger will attach to the running process, and your breakpoints will be hit.

## Node.js inspector

If you're not using VSCode or prefer a different debugging interface, you can use the Node.js inspector directly. Start your dev server with the `--inspect` flag.

```bash
node ace --inspect serve --hmr
```

This starts the Node.js inspector on port 9229. You can then connect using Chrome DevTools by navigating to `chrome://inspect` in Chrome, or use any other debugger that supports the Node.js inspector protocol.

## Framework debug logs

AdonisJS packages include debug logs that provide visibility into framework internals. These logs are disabled by default because they're verbose, but they're invaluable when you need to understand what's happening at the framework level.

Enable debug logs by setting the `NODE_DEBUG` environment variable when starting your application.

```bash
NODE_DEBUG=adonisjs:* node ace serve --hmr
```

The wildcard `*` enables logs from all AdonisJS packages. If you already know which package you're investigating, specify it directly to reduce noise.

```bash
# Debug only the HTTP layer
NODE_DEBUG=adonisjs:http node ace serve --hmr

# Debug session handling
NODE_DEBUG=adonisjs:session node ace serve --hmr

# Debug the application lifecycle
NODE_DEBUG=adonisjs:app node ace serve --hmr
```

Package names follow the convention `adonisjs:<package-name>`, where the package name corresponds to the AdonisJS package you want to debug.

## Edge template debugging

When working with Edge templates, you can inspect variables directly in the browser using `@dump` and `@dd`. These tags render a formatted representation of any value, making it easy to understand what data your templates are receiving.

### The @dump tag

The `@dump` tag outputs a formatted representation of a value and continues rendering the rest of the template:

```edge title="resources/views/posts/show.edge"
{{-- Inspect component props --}}
@dump($props.all())

{{-- Inspect the entire template state --}}
@dump(state)

{{-- Inspect a specific variable --}}
@dump(post)
```

### The @dd tag

The `@dd` tag (dump and die) stops template rendering immediately and displays only the dumped value. Use this when you want to focus on a specific value without the rest of the page's output:

```edge title="resources/views/posts/show.edge"
@dd(post)

{{-- Nothing below this line will render --}}
<h1>{{ post.title }}</h1>
```

### Setting up the dumper

The `@dump` and `@dd` tags require the dumper's frontend assets to be loaded. Add the `@stack('dumper')` directive to your layout's `<head>` section.

```edge title="resources/views/layouts/main.edge"
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    @stack('dumper')
  </head>
  <body>
    @!section('content')
  </body>
</html>
```

Official AdonisJS starter kits include this setup by default.

### Configuring the dumper

You can customize how the dumper formats output by exporting a `dumper` configuration from `config/app.ts`.

```ts title="config/app.ts"
import { defineConfig as dumperConfig } from '@adonisjs/core/dumper'

export const dumper = dumperConfig({
  /**
   * Settings for console output (e.g., console.log)
   */
  console: {
    depth: 10,
    collapse: ['DateTime', 'Date'],
    inspectStaticMembers: true,
  },

  /**
   * Settings for HTML output (@dump and @dd)
   */
  html: {
    depth: 10,
    inspectStaticMembers: true,
  },
})
```

The following options are available for both `console` and `html` printers.

::::options
:::option{name="showHidden" dataType="boolean" defaultValue="false"}
Include non-enumerable properties
:::

:::option{name="depth" dataType="number" defaultValue="5"}
Maximum depth for nested structures (objects, arrays, maps, sets)
:::

:::option{name="inspectObjectPrototype" dataType="boolean | string" defaultValue="unless-plain-object"}
Include prototype properties. Set to `true` for all objects, `false` for none, or `'unless-plain-object'` for class instances only.
:::

:::option{name="inspectArrayPrototype" dataType="boolean" defaultValue="false"}
Include array prototype properties
:::

:::option{name="inspectStaticMembers" dataType="boolean" defaultValue="false"}
Include static members of classes
:::

:::option{name="maxArrayLength" dataType="number" defaultValue="100"}
Maximum items to display for arrays, maps, and sets
:::

:::option{name="maxStringLength" dataType="number" defaultValue="1000"}
Maximum characters to display for strings
:::

:::option{name="collapse" dataType="string[]" defaultValue="[]"}
Array of constructor names that should not be expanded further
:::
::::

## Exception handler debug mode

During development, AdonisJS displays [detailed error pages](./exception_handling.md#debug-mode-and-youch) powered by Youch when an unhandled exception occurs. These pages include the full stack trace, request information, and application state, making it easy to diagnose issues.

Debug mode is enabled automatically in development and disabled in production. This behavior is controlled by the exception handler configuration.
