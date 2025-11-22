---
title: 'Development Environment Setup'
description: 'Learn how to configure an efficient development environment for building applications with AdonisJS.'
---

# Development Environment Setup

This guide covers the recommended development environment for AdonisJS applications. You will learn about pre-configured TypeScript settings, ESLint and Prettier integration, recommended code editor extensions for improved productivity, and database options for local development.

## Overview

AdonisJS applications come with a fully configured development environment out of the box. **TypeScript, ESLint, and Prettier** are pre-configured with sensible defaults, allowing you to start building immediately without manual setup.

This guide explains what's already configured in your project, recommends optional editor extensions that enhance the development experience, and provides guidance on choosing a database for local development. Understanding these configurations helps you leverage the full capabilities of the framework and maintain consistency across your team.

## Code Editors and Extensions

AdonisJS works with any modern code editor that supports **TypeScript**. The framework does not rely on custom domain-specific languages (DSLs), so most editors provide full language support out of the box. The only framework-specific syntax is the **Edge templating engine**, which benefits from dedicated syntax highlighting extensions.

:::card{name="AdonisJS Extension" logo="resources/assets/adonisjs-icon.svg"}
---
links:
  - href: https://marketplace.visualstudio.com/items?itemName=jripouteau.adonis-vscode-extension
    text: VSCode
---

Provides IntelliSense for AdonisJS APIs, file generators, and command palette integration for running Ace commands.
:::

:::card{name="Japa Extension" logo="resources/assets/japa-icon.svg"}
---
links:
  - href: https://marketplace.visualstudio.com/items?itemName=jripouteau.japa-vscode
    text: VSCode
---

Test runner integration for running individual tests or test suites directly from the editor.
:::

:::card{name="Edge Templates Extension" logo="resources/assets/edge-icon.svg"}
---
links:
  - href: https://marketplace.visualstudio.com/items?itemName=AdonisJS.vscode-edge
    text: VSCode
  - href: https://zed.dev/extensions/edge
    text: Zed
  - href: https://packagecontrol.io/packages/Edge%20templates%20extension
    text: Sublime Text
---

Full syntax highlighting and basic autocomplete for Edge template files.
:::

## TypeScript Setup

TypeScript is a first-class citizen in AdonisJS. Every application is created and runs using TypeScript by default, with all configuration handled automatically. Understanding how TypeScript works in development versus production, and the required compiler options, helps you make informed decisions about deployment and tooling.

### Required TypeScript Configuration

AdonisJS requires specific TypeScript compiler options to function correctly. The framework relies heavily on **experimental decorators** for dependency injection, model definitions, and Ace commands.

The following `tsconfig.json` configuration represents the bare minimum required for AdonisJS applications:

::::tabs

:::tab{title="Non-Inertia apps"}

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "isolatedModules": true,
    "declaration": false,
    "outDir": "./build",
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  },
  "include": ["**/*", ".adonisjs/server/**/*"]
}
```

:::

:::tab{title="Inertia apps"}

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "isolatedModules": true,
    "declaration": false,
    "outDir": "./build",
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  },
  // [!code ++:5]
  "references": [
    {
      "path": "./inertia/tsconfig.json"
    }
  ],
  "include": ["**/*", ".adonisjs/server/**/*"]
}
```

:::

::::

### Development Mode (JIT Compilation)

In development, AdonisJS uses a **Just-in-Time (JIT) compiler** provided by the `@poppinss/ts-exec` package. This approach executes TypeScript files directly without a separate compilation step, enabling instant feedback when you save changes.

This differs from Node.js' native TypeScript support because AdonisJS requires:

- **Experimental decorators** support (used for dependency injection and model decorators)
- **JSX compilation** (if you replace Edge with a JSX-based template engine like Inertia)

Since Node.js' built-in TypeScript loader does not support these features, [`@poppinss/ts-exec`](https://github.com/poppinss/ts-exec) provides the necessary compatibility layer.

### Production Mode (Ahead-of-Time Compilation)

For production deployments, AdonisJS compiles your TypeScript code into JavaScript using the official TypeScript compiler (`tsc`). This process generates a `build/` directory containing transpiled `.js` files optimized for the Node.js runtime.

```bash
node ace build
```

The compiled output includes:

- Transpiled JavaScript files with decorators transformed
- Copied static assets and templates
- Optimized module imports
- Removed development-only code

See also: [Deploying to production](./deploying-to-production.md), [TypeScript build process](../concepts/typescript_build_process.md)

## ESLint and Prettier Configuration

AdonisJS projects include pre-configured **ESLint** and **Prettier** setups that enforce TypeScript best practices and maintain consistent code formatting across your team.

:::tip
Most code editors support running ESLint and Prettier automatically on file save. Configuring this in your editor eliminates manual formatting steps and catches linting issues immediately.
:::


### ESLint

The default ESLint configuration extends the AdonisJS base config, which includes rules for TypeScript, async/await patterns, and framework conventions. You can override or extend these rules in `eslint.config.js` as needed.

```js title="eslint.config.js"
import { configApp } from '@adonisjs/eslint-config'
export default configApp()
```

Run ESLint manually:

```bash
npm run lint
```

### Prettier

Prettier configuration is defined in `package.json`, ensuring all files are formatted consistently. The AdonisJS preset includes sensible defaults for indentation, quotes, and line length.

```json title="package.json"
{
  "prettier": "@adonisjs/prettier-config"
}
```

Run Prettier manually:

```bash
npm run format
```

See also: [ESLint configuration reference](https://github.com/adonisjs/tooling-config/tree/main/packages/eslint-config), [Prettier configuration reference](https://github.com/adonisjs/tooling-config/tree/main/packages/prettier-config)

## Database Setup

AdonisJS applications are pre-configured with **SQLite**, a lightweight file-based database. SQLite requires no installation and stores data in a local `tmp/database.sqlite` file, allowing you to start building immediately without setting up external database servers.

However, most applications use PostgreSQL or MySQL in production. We recommend switching to your production database engine early in development to avoid schema differences and driver-specific behavior that can cause deployment issues.

### Local database tools

You can use the following tools to run PostgreSQL or MySQL locally:

- [Dbngin](https://dbngin.com/) – GUI for managing PostgreSQL and MySQL on macOS and Windows
- [Docker](https://www.docker.com/) – Run databases in containers for isolated environments
- [Postgres.app](https://postgresapp.com/) – Native PostgreSQL for macOS
