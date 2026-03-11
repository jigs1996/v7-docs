---
title: 'Folder structure'
description: 'Understand the default folder structure of an AdonisJS application and the role of each file and directory.'
---

# Folder structure

When you create a new AdonisJS application, it comes with a thoughtful default folder structure designed to keep projects tidy, predictable, and easy to refactor.  

This structure reflects conventions that work well for most projects, but AdonisJS does not lock you into them. You are free to reorganize files and directories to suit your team's workflow.

Depending on the starter kit you select, some files or directories may differ. For example, the **Inertia** starter kit contains a top-level `inertia` folder, whereas the **Hypermedia** starter kit does not include this folder.

## Overview

Here's what a freshly created AdonisJS project looks like.

::::tabs

:::tab{title="Hypermedia / Inertia kits"}

```sh
├── app
├── bin
├── config
├── database
├── resources
├── start
├── tests
├── ace.js
├── adonisrc.ts
├── eslint.config.js
├── package-lock.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```

:::

:::tab{title="API kit"}

The API starter kit is a monorepo with two workspaces managed by [Turborepo](https://turbo.build/repo):

```sh
├── apps
│   ├── backend           # AdonisJS application
│   │   ├── app
│   │   ├── bin
│   │   ├── config
│   │   ├── database
│   │   ├── start
│   │   ├── tests
│   │   ├── ace.js
│   │   ├── adonisrc.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend          # Your frontend application
│       ├── package.json
│       └── ...
├── package.json          # Root package.json with workspaces
├── package-lock.json
└── turbo.json            # Turborepo pipeline configuration
```

The `apps/backend` directory contains a standard AdonisJS application — all the sections below (`app/`, `config/`, `start/`, etc.) apply to that directory. The `apps/frontend` directory is where you set up your frontend framework (TanStack Start, Next.js, Nuxt, or others).

The root `package.json` defines the workspaces:

```json
{
  "workspaces": ["apps/*"]
}
```

And `turbo.json` configures the `dev`, `build`, and other scripts to run across both apps. When you run `npm run dev` from the project root, Turborepo starts both the backend and frontend dev servers in parallel.

:::

::::

Each directory and file has a specific purpose. The sections below explain the role of each item and what you are likely to find there.

## `app/`

The `app` directory organizes code for the domain logic of your application. For example, the controllers, models, mails, middleware, etc., all live within the `app` directory.

Feel free to create additional folders in the `app` directory to better organize your codebase.

```sh
├── app
│   ├── controllers
│   ├── exceptions
│   ├── mails
│   ├── middleware
│   ├── models
│   ├── transformers
│   └── validators
```

## `bin/`

The `bin` directory contains the entry point files used to start your AdonisJS application in different environments. 

- The `console.ts` file uses the Ace commandline framework to execute CLI commands.
- The `server.ts` file starts the application in the web environment to listen for HTTP requests.
- The `test.ts` file is used to boot the application for the testing environment.

You usually won't need to modify these files unless you want to customize how the app boots in a 
specific context.

```sh
├── bin
│   ├── console.ts
│   ├── server.ts
│   └── test.ts
```

## `config/`

All application and third-party configuration files live inside the `config` directory. You can also store config local to your application inside this directory.

```sh
├── config
│   ├── app.ts
│   ├── auth.ts
│   ├── bodyparser.ts
│   ├── database.ts
│   ├── hash.ts
│   ├── limiter.ts
│   ├── logger.ts
│   ├── mail.ts
│   ├── session.ts
│   ├── shield.ts
│   ├── static.ts
│   └── vite.ts
```

## `database/`

The `database` directory holds artifacts related to the database layer. By default, AdonisJS ships with Lucid ORM configured for SQLite; switching databases does not require reorganizing this folder. 

- `migrations/` - versioned schema changes
- `seeders/` - scripts to insert initial or test data
- `factories/` - blueprints for generating model instances in tests or seeders
- `schema.ts` - auto-generated database schema used by models
- `schema_rules.ts` - auto-generated schema rules used by validators

See also: [Lucid documentation](https://lucid.adonisjs.com)

```sh
database/
  ├── migrations/
  ├── seeders/
  ├── factories/
  ├── schema.ts
  └── schema_rules.ts
```

## `providers/`

The `providers` directory is used to store the [service providers](../guides/concepts/service_providers.md) used by your application. You can create new providers using the `node ace make:provider` command.

```sh
├── providers
│  └── app_provider.ts
```

## `public/`

The `public` directory contains raw static assets that are served directly to the browser without any compilation step. Files in this directory are publicly accessible over HTTP using the `http://localhost:3333/public/<file-name>` URL.

:::note
The API starter kit does not include a `public` directory, since the backend serves only JSON responses and does not serve static assets.
:::

Typical examples of files stored in this folder include:

- Favicon `(favicon.ico)`
- Robots file `(robots.txt)`
- Static images `(logo.png, social-banner.jpg)`
- Downloadable assets `(manual.pdf)`

## `resources/`

The `resources` directory stores Edge templates and uncompiled frontend assets such as CSS and JavaScript files.

:::note
The API starter kit does not include a `resources` directory, since the backend serves only JSON responses and does not render HTML templates.
:::

For applications using Inertia (alongside Vue or React), the frontend code is kept within the `inertia` directory, and the `resources` directory contains only the root Edge template. Think of this root template as the `index.html` file that contains the HTML shell for your frontend application.

::::tabs
:::tab{title="Hypermedia app"}

```sh
├── resources
│   ├── css
│   ├── js
│   └── views
│       ├── home.edge
```

:::

:::tab{title="Inertia app"}

```sh
├── resources
│   └── views
│       └── inertia_layout.edge
```

:::

::::

## `inertia/`

The `inertia` directory exists only in projects using the Inertia starter kit. It represents a sub-application containing the frontend source code, including React or Vue components, pages, and supporting utilities.

- `pages/` - stores your Inertia pages written in React or Vue.
- `app.(tsx|vue)` - the main entry point for the client-side application.
- `ssr.(tsx|vue)` - the entry point for server-side rendering (SSR).
- `tsconfig.json` - The TypeScript config file for the frontend codebase. The defaults are optimized for browser environments, JSX/TSX syntax, and Vite-based builds

You are free to create additional subfolders, such as `components/`, `layouts/`, or `utils/`, to organize your frontend code.

```sh
├── inertia
│   ├── css
│   ├── layouts
│   ├── pages
│   │   └── home.tsx
│   ├── app.tsx
│   ├── ssr.tsx
│   ├── tsconfig.json
│   └── types.ts
```

### Clear separation between frontend and backend

AdonisJS maintains a clear boundary between the backend and the frontend. You should **never import backend code** (such as models, services, or transformers) into your frontend application.

In practice, your frontend communicates with the backend through HTTP requests and **receives plain JSON data**. AdonisJS encourages you to model this reality explicitly. Data is fetched and transformed via API responses, rather than being hidden behind shared abstractions.

### Shared types

The frontend can still rely on shared TypeScript types automatically generated by AdonisJS. These are stored inside the `.adonisjs/client` directory and include type definitions for routes, props, and other shared contracts.

This approach allows frontend code to remain strongly typed without compromising the separation between the client and the server.

We recommend reading the [types generation docs](../guides/frontend/transformers.md#step-4-understanding-the-generated-types) to understand how AdonisJS creates shared types.

## `start/`

The `start` directory contains the files you want to import during the boot lifecycle of the application. For example, the files to register routes and define event listeners should live within this directory.

```sh
├── start
│   ├── env.ts
│   ├── kernel.ts
│   └── routes.ts
```

AdonisJS does not auto-import files from the `start` directory. It is merely used as a convention to group similar files. We recommend reading about [preload files](../guides/concepts/application_lifecycle.md#running-code-before-the-application-starts) and the [application boot lifecycle](../guides/concepts/application_lifecycle.md) to have a better understanding of which files to keep under the start directory.

## `tests/`

The `tests` directory contains automated tests. AdonisJS uses the [Japa](https://japa.dev) test runner.

Tests are organized within specific sub-folders. When running `unit` tests, AdonisJS boots the application but does not start the HTTP server. Whereas, during `functional` tests, we start the HTTP server and the Vite Dev-server.

See also: [Testing docs](../guides/testing/introduction.md)

```sh
├── tests
│   ├── unit
│   ├── functional
│   └── bootstrap.ts
```

## `tmp/`

The temporary files generated by your application are stored within the `tmp` directory. For example, these could be user-uploaded files (generated during development) or logs written to the disk.

The `tmp` directory must be ignored by the `.gitignore` rules, and you should not copy it to the production server either.

## `ace.js`

The `ace.js` file is the entry point for executing Ace commands. This file configures a JIT TypeScript compiler and then imports the `bin/console.ts` file.

## `adonisrc.ts`

`adonisrc.ts` is the project manifest. It tells AdonisJS how to discover and load parts of your application and includes configuration for:

- Directory aliases (for `app`, `start`, etc.)
- Preload files
- Registered providers and commands
- Assembler hooks

See also: [AdonisRC file reference](../reference/adonisrc_file.md)

## `eslint.config.js`

This file configures ESLint for the project. The default rules are tuned for TypeScript and AdonisJS conventions. You can modify or extend this configuration to match your team's style.

## `package.json` and `package-lock.json`

- `package.json` - project metadata, scripts, and dependency declarations.
- `package-lock.json` - locks exact dependency versions for consistent installs.

## `tsconfig.json`

`tsconfig.json` controls TypeScript compiler options, module resolution, and path aliases. The provided configuration is suitable for both development and production builds. However, you can adjust the compiler settings to match your specific workflow.

:::note

AdonisJS relies on `experimentalDecorators` for Dependency Injection, Ace commands, and the Lucid ORM.

:::

The following configuration options are required for AdonisJS internals to work correctly.

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
      "path": "./tsconfig.inertia.json"
    }
  ],
  "include": ["**/*", ".adonisjs/server/**/*"]
}
```

:::

::::

## `vite.config.ts`

When the project uses Vite (Edge or Inertia starter kits), `vite.config.ts` defines how frontend assets are compiled and served. Customize entry points, aliases, and plugin settings here if you need specialized bundling behavior.
