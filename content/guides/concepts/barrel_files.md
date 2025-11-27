---
summary: Understand what barrel files are, why AdonisJS uses them, and how they help reduce visual clutter in your codebase.
---

# Barrel Files

This guide explains the concept of barrel files in AdonisJS. You will learn what barrel files are, why they exist, how they reduce import clutter in your routes file, how the auto-generation process works, and how to disable them if you prefer direct imports.

## Overview

A **barrel file** is an auto-generated collection of exports for a specific entity type in your application. AdonisJS creates barrel files for controllers, events, and event listeners, storing them in the `.adonisjs/server` directory. These files are automatically kept up-to-date as you create or remove files during development.

The purpose of barrel files is purely aesthetic and ergonomic. They consolidate multiple import statements into a single import, reducing visual noise at the top of files like `start/routes.ts`. There is no functional benefit or performance advantage to using barrel files—they exist to keep your code tidy and easier to scan.

Barrel files are completely optional. You can continue using direct imports if you prefer, or disable barrel file generation entirely through configuration.

## The problem: Import clutter

As your application grows, files like `start/routes.ts` accumulate dozens of controller imports. Here's what a routes file looks like with just four controllers:
```ts
// title: start/routes.ts
import router from '@adonisjs/core/services/router'

/**
 * In a real application, this list easily grows to dozens of controllers,
 * forcing you to scroll past all these imports before seeing your routes.
 */
const NewAccountController = () => import('#controllers/new_account_controller')
const SessionController = () => import('#controllers/session_controller')
const PostsController = () => import('#controllers/posts_controller')
const PostCommentsController = () => import('#controllers/post_comments_controller')

router.get('signup', [NewAccountController, 'create'])
router.post('signup', [NewAccountController, 'store'])
router.get('login', [SessionController, 'create'])
router.post('login', [SessionController, 'store'])
router.get('posts', [PostsController, 'index'])
router.get('posts/:id', [PostsController, 'show'])
router.get('posts/:id/comments', [PostCommentsController, 'index'])
```

With just four controllers, the imports already consume significant vertical space. In production applications with 20+ controllers, you spend more time scrolling past imports than working with routes.

## The solution: Barrel files

Barrel files consolidate all those individual imports into a single import statement. Here's the same routes file using the controllers barrel file:
```ts
// title: start/routes.ts
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('signup', [controllers.NewAccount, 'create'])
router.post('signup', [controllers.NewAccount, 'store'])
router.get('login', [controllers.Session, 'create'])
router.post('login', [controllers.Session, 'store'])
router.get('posts', [controllers.Posts, 'index'])
router.get('posts/:id', [controllers.Posts, 'show'])
router.get('posts/:id/comments', [controllers.PostComments, 'index'])
```

The difference is immediately visible: four imports become one, and your routes are right at the top of the file where you need them. The only change to your route definitions is using the `controllers` namespace to access each controller.

## How barrel files work

The barrel file itself is remarkably simple—just a JavaScript object mapping controller names to lazy import functions. Here's what `.adonisjs/server/controllers.ts` looks like:

```ts
// title: .adonisjs/server/controllers.ts
export const controllers = {
  NewAccount: () => import('#controllers/new_account_controller'),
  Session: () => import('#controllers/session_controller'),
  Posts: () => import('#controllers/posts_controller'),
  PostComments: () => import('#controllers/post_comments_controller')
}
```

The dev server generates this file automatically when you run `node ace serve`. As you create or delete controllers during development, the dev server's watcher updates the barrel file to stay in sync with your codebase.

### File locations and import aliases

Barrel files live in the `.adonisjs/server` directory:
- `.adonisjs/server/controllers.ts` - Controller barrel file
- `.adonisjs/server/events.ts` - Event barrel file  
- `.adonisjs/server/listeners.ts` - Event listener barrel file

The `.adonisjs/server` directory is registered as a subpath import alias in your `package.json`, allowing you to import these files using the `#generated` prefix:

```ts
import { controllers } from '#generated/controllers'
import { events } from '#generated/events'
import { listeners } from '#generated/listeners'
```

:::note
The `.adonisjs` directory contains auto-generated files managed by the framework. You should not manually edit files in this directory, as your changes will be overwritten when the dev server regenerates them.
:::

## Performance and lazy loading

You might wonder: doesn't importing all controllers at once hurt performance? The answer is no, because barrel files use **lazy imports**.

Each controller in the barrel file is wrapped in a function that returns a dynamic import:
```ts
{
  Posts: () => import('#controllers/posts_controller')
}
```

The `() => import()` function is only called when you actually use that controller in a route. Until then, the controller module is never loaded. This means barrel files have zero performance impact—controllers are still loaded on-demand, exactly as they would be with direct imports.

## Barrel files are optional

Barrel files are a convenience feature, not a requirement. You have several options:

**Option 1: Use barrel files** (default)
```ts
import { controllers } from '#generated/controllers'
router.get('posts', [controllers.Posts, 'index'])
```

**Option 2: Use direct imports**
```ts
const PostsController = () => import('#controllers/posts_controller')
router.get('posts', [PostsController, 'index'])
```

**Option 3: Mix both approaches**
You can use barrel files for most controllers and direct imports for specific cases. However, consistency within a file is generally preferable for readability.

Both approaches work identically—barrel files are purely a matter of personal preference and code organization style.

## Common pitfall: IDE auto-imports

When typing a controller name in your routes file, your IDE may automatically add a direct import at the top of the file, even though you're using barrel files elsewhere in the same file. This creates an inconsistent mix of import styles:
```ts title="start/routes.ts"
// IDE added this automatically
const PostsController = () => import('#controllers/posts_controller')

// But you're already using barrel files
import { controllers } from '#generated/controllers'

router.get('posts', [PostsController, 'index'])
router.get('users', [controllers.Users, 'index'])
```

This happens because your IDE doesn't know you prefer barrel files and defaults to importing the file directly when it detects the controller name.

To avoid this, delete the auto-imported line and use the barrel file namespace instead:

```ts title="start/routes.ts"
import { controllers } from '#generated/controllers'

router.get('posts', [controllers.Posts, 'index'])
router.get('users', [controllers.Users, 'index'])
```

A helpful habit: always type `controllers.` first, then let your IDE autocomplete the controller name from the barrel file. This prevents the auto-import from triggering.

## Disabling barrel files

If you prefer not to use barrel files, you can disable their generation through the `adonisrc.ts` configuration file.

Barrel file generation is managed by an Assembler hook. To disable generation for a specific entity type, modify the `hooks.init` configuration:

```ts title="adonisrc.ts"
import { defineConfig } from '@adonisjs/core/app'

export default defineConfig({
  // ...other config
  
  hooks: {
    init: [
      () => import('@adonisjs/core/build/plugins/index_entities'),
      // Pass options to disable specific barrel files
      {
        indexEntities: {
          // Disable controller barrel file
          controllers: false,
          // Keep events and listeners enabled
          events: true,
          listeners: true
        }
      }
    ]
  }
})
```

After disabling barrel file generation, existing barrel files will remain in the `.adonisjs/server` directory. You'll need to manually remove them and update any code that references them to use direct imports instead.

## See also

- [Controllers](./controllers.md) - Learn how to create and use controllers
- [Routing](./routing.md) - Comprehensive guide to defining routes
- [TypeScript Build Process](../concepts/typescript_build_process.md) - Understanding AdonisJS's build system