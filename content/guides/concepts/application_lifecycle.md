# Application Lifecycle

AdonisJS offers various checkpoints you can use to perform actions throughout the application's lifecycle. Hooks can be defined for specific runtime environments, such as the HTTP server, Ace commands, or hooks executed during tests.

## Overview

The application lifecycle in AdonisJS consists of three distinct phases: **boot**, **start**, and **termination**. Each phase serves a specific purpose in preparing your application, running it, and gracefully shutting it down.

Understanding the lifecycle is essential when you need to execute code at specific points during your application's runtime. For example, you might want to register custom validation rules before your application starts handling requests, or perform cleanup operations before your application terminates.

The lifecycle flows chronologically from boot to start, and eventually to termination when the process receives a shutdown signal. Each phase has clearly defined responsibilities and happens in a predictable order, allowing you to hook into the exact moment you need.

## Boot phase

The boot phase is the initial stage where AdonisJS prepares your application for execution. During this phase, you can use the IoC container to fetch bindings and extend parts of the framework.

This is when service providers register their bindings into the container and execute their `boot` methods. The framework itself is being configured and prepared, but your application isn't yet ready to handle requests or execute commands.

![Boot phase flow chart](./boot_phase_flow_chart.png)

The boot phase completes before any preload files are imported or application-specific code runs. Think of it as the foundation-laying phase where the framework assembles all the pieces it needs.

## Start phase

The start phase is where your application comes to life. During this phase, AdonisJS imports preload files and executes the `start` and `ready` methods from service providers.

This is when your application-specific initialization happens. Routes are registered, event listeners are attached, custom validation rules are defined, and any other application setup code runs. By the end of this phase, your application is fully operational and ready to handle HTTP requests, execute Ace commands, or run tests depending on the environment.

![Start phase flow chart](./start_phase_flow_chart.png)

The start phase is environment-aware, meaning you can configure different behavior for the HTTP server, Ace commands, or test environments. All preload files configured for the current environment are imported in parallel for optimal performance.

## Termination phase

The termination phase happens when AdonisJS begins the graceful shutdown process. This usually occurs when the process receives the `SIGTERM` signal, such as when you stop your development server or during a deployment.

During this phase, service providers execute their `shutdown` methods, allowing them to perform cleanup operations like closing database connections, flushing logs, or canceling pending background jobs.

![Termination phase flow chart](./termination_phase_flow_chart.png)

The graceful shutdown ensures your application stops cleanly rather than abruptly terminating mid-operation, helping prevent data corruption and ensuring proper resource cleanup.

## Running code before the application starts

The most common way to execute code during the application lifecycle is through **preload files**. These are TypeScript files that live in the `start` directory and run during the start phase.

AdonisJS already includes preload files you use regularly. The `start/routes.ts` file registers your application routes, and the `start/kernel.ts` file configures your middleware stack. Both are examples of preload files in action.

### Creating a preload file

You can create a custom preload file using the `make:preload` command:
```bash
node ace make:preload events
```

This command creates a new file in the `start` directory and automatically registers it in your `adonisrc.ts` configuration file.

Here's an example preload file that registers an event listener:
```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'

emitter.on('user:registered', function (user) {
  console.log(user)
})
```

Preload files can be used for various tasks like adding custom validation rules, listening for events, or performing any initialization your application needs before it starts handling requests.

### Environment-specific preload files

You can configure preload files to load only in specific runtime environments by specifying the `environment` property in your `adonisrc.ts` file:
```ts
// title: adonisrc.ts
{
  preloads: [
    () => import('./start/routes.js'),
    () => import('./start/kernel.js'),
    // highlight-start
    {
      file: () => import('./start/events.js'),
      environment: ['web', 'console']
    }
    // highlight-end
  ]
}
```

The `environment` property accepts an array of values. Valid environments include `web` (HTTP server), `console` (Ace commands), `test` (test runner), and `repl` (REPL environment).

All preload files are imported in parallel for optimal performance during application startup.

## See also

- [Service providers guide](link-to-service-providers) - Learn about the `register`, `boot`, `start`, `ready`, and `shutdown` methods available in service providers for more advanced lifecycle hooks
- [AdonisRC file reference](link-to-adonisrc-reference) - Complete reference for configuring preload files and other application settings