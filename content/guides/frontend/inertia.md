---
description: Learn how to build modern single-page applications using Inertia with AdonisJS, React, and Vue.
---

# Inertia

This guide covers using Inertia with AdonisJS to build single-page applications. You will learn how to:

- Render Inertia pages from controllers and pass props to frontend components
- Structure the `inertia/` directory and understand key configuration files
- Use data loading patterns like optional, deferred, and mergeable props
- Build forms and navigation with the `Link` and `Form` components
- Share data globally across all pages
- Enable server-side rendering (SSR)
- Understand the request lifecycle in Inertia applications

## Overview

Inertia acts as a bridge between AdonisJS and frontend frameworks like React and Vue. It eliminates the need for client-side routing or complex state management libraries by embracing a server-first architecture. You write controllers and routes exactly as you would in a traditional server-rendered application, but instead of returning HTML or JSON, you render Inertia pages that your frontend framework displays.

This approach gives you the best of both worlds: the simplicity of server-side routing and data fetching combined with the rich interactivity of React or Vue for the view layer. AdonisJS officially supports both frameworks through the Inertia starter kit.

See also: [How Inertia works](https://inertiajs.com/how-it-works) on the official Inertia documentation.

## Rendering pages

Controllers in an Inertia application work the same way as any AdonisJS controller. The difference is that instead of rendering Edge templates or returning JSON, you call `inertia.render()` to render a frontend component with props.

```ts title="start/routes.ts"
router.get('/posts', [controllers.Posts, 'index'])
```

The controller receives the `inertia` object from the HTTP context and uses it to render a page component with data.

```ts title="app/controllers/posts_controller.ts"
import Post from '#models/post'
import type { HttpContext } from '@adonisjs/core/http'
import PostTransformer from '#transformers/post_transformer'

export default class PostsController {
  async index({ inertia }: HttpContext) {
    const posts = await Post.all()

    /**
     * The first argument is the page component path relative to inertia/pages/.
     * The second argument is the props object passed to that component.
     */
    return inertia.render('posts/index', {
      posts: PostTransformer.transform(posts)
    })
  }
}
```

The page component receives the props and renders the UI. Rather than defining prop types manually, you can rely on auto-generated types from your transformers.

::::tabs

:::tab{title="React"}
```tsx title="inertia/pages/posts/index.tsx"
import { InertiaProps } from '~/types'
import { Data } from '~/generated/data'

type PageProps = InertiaProps<{ posts: Data.Post[] }>

export default function PostsIndex({ posts }: PageProps) {
  return (
    <>
      {posts.map((post) => (
        <div key={post.id}>
          <h2>{post.title}</h2>
        </div>
      ))}
    </>
  )
}
```
:::

:::tab{title="Vue"}
```vue title="inertia/pages/posts/index.vue"
<script setup lang="ts">
import { Data } from '~/generated/data'

defineProps<{ posts: Data.Post[] }>()
</script>

<template>
  <div v-for="post in posts" :key="post.id">
    <h2>{{ post.title }}</h2>
  </div>
</template>
```
:::

::::

When the first request hits the server, Inertia renders a shell HTML page containing a `div` with the component name and serialized props. The frontend bundle uses this data to boot the React or Vue application. From that point on, all navigation happens via `fetch` requests that receive JSON responses, giving you the snappy feel of a SPA without building an API.

See also: [Transformers](./transformers.md) for details on serializing model data for the frontend.

## The inertia directory

The `inertia/` directory contains your frontend application. Here is the structure created by the starter kit:

```
inertia/
├── app.tsx (or app.vue)     # Frontend application entrypoint
├── ssr.tsx (or ssr.vue)     # SSR entrypoint (when enabled)
├── tsconfig.json            # TypeScript config for frontend code
├── pages/                   # Page components rendered by controllers
│   └── home.tsx
└── layouts/                 # Reusable layout components
    └── default.tsx
```

The `pages/` directory is where Inertia looks for components when you call `inertia.render()`. The path you pass (like `posts/index`) maps directly to a file in this directory (`inertia/pages/posts/index.tsx`).

The `app.tsx` (or `app.vue`) file is the entrypoint that boots your frontend application. It initializes Inertia with your page components and any global configuration. The `ssr.tsx` file serves the same purpose for server-side rendering.

You can create additional directories as your project grows, such as `components/` for shared UI elements or `hooks/` for custom React hooks.

## Configuration files

Two configuration files control how Inertia works in your AdonisJS application.

The `config/inertia.ts` file defines the Inertia adapter settings, including SSR configuration and the page component resolver.

```ts title="config/inertia.ts"
import { defineConfig } from '@adonisjs/inertia'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge template that renders the initial HTML shell.
   */
  rootView: 'inertia_layout',

  /**
   * SSR configuration (covered in the SSR section below).
   */
  ssr: {
    enabled: false,
    entrypoint: 'inertia/ssr.tsx',
  },
})

export default inertiaConfig
```

The `resources/views/inertia_layout.edge` template renders the initial HTML shell that contains the root `div` where your frontend application mounts.

## Generated types

The `Data` namespace imported in page components comes from auto-generated types stored at `.adonisjs/client/data.d.ts`. These types are created by an Assembler hook when you use transformers, ensuring your frontend props stay in sync with your backend serialization logic.

See also: [Transformers](./transformers.md) for details on how types are generated.

## Data loading patterns

Inertia provides several patterns for loading data efficiently. AdonisJS exposes helpers on the `inertia` object to support each pattern.

### Optional props

Optional props are only evaluated when the frontend explicitly requests them during a partial reload. This is useful for expensive queries that aren't needed on every page load.

```ts title="app/controllers/users_controller.ts"
return inertia.render('users/index', {
  /**
   * The database query only runs when the frontend
   * includes 'users' in a partial reload request.
   */
  users: inertia.optional(async () => {
    const users = await User.all()
    return UserTransformer.transform(users)
  })
})
```

See also: [Partial reloads](https://inertiajs.com/partial-reloads) on the Inertia documentation.

### Always props

The `always` helper ensures a prop is always included in responses, even during partial reloads that don't explicitly request it. This is the opposite of optional props.

```ts title="app/controllers/users_controller.ts"
return inertia.render('users/index', {
  /**
   * Permissions are always computed and included,
   * regardless of what the frontend requests.
   */
  permissions: inertia.always(async () => {
    const permissions = await Permissions.all()
    return PermissionTransformer.transform(permissions)
  })
})
```

### Deferred props

Deferred props are loaded after the initial page render, allowing the page to display immediately while slower data loads in the background. The frontend shows a loading state until the deferred data arrives.

```ts title="app/controllers/dashboard_controller.ts"
return inertia.render('dashboard', {
  /**
   * These props load after the page renders.
   * The frontend can show loading indicators.
   */
  metrics: inertia.defer(async () => {
    return computeMetrics()
  }),
  newSignups: inertia.defer(async () => {
    return getNewSignups()
  })
})
```

You can group deferred props so they load together in a single request.

```ts title="app/controllers/dashboard_controller.ts"
return inertia.render('dashboard', {
  /**
   * Both props are fetched in the same deferred request
   * because they share the 'dashboard' group name.
   */
  metrics: inertia.defer(async () => {
    return computeMetrics()
  }, 'dashboard'),
  newSignups: inertia.defer(async () => {
    return getNewSignups()
  }, 'dashboard')
})
```

See also: [Deferred props](https://inertiajs.com/deferred-props) on the Inertia documentation.

### Mergeable props

Mergeable props are merged with existing frontend data rather than replacing it. This is useful for infinite scrolling or appending new items to a list.

```ts title="app/controllers/users_controller.ts"
return inertia.render('users/index', {
  /**
   * New notifications are merged with existing ones
   * instead of replacing the entire array.
   */
  notifications: inertia.merge(await fetchNotifications())
})
```

You can combine merging with deferred loading by chaining the `merge()` method.

```ts title="app/controllers/users_controller.ts"
return inertia.render('users/index', {
  notifications: inertia.defer(() => {
    return fetchNotifications()
  }).merge()
})
```

By default, data is shallow merged. For nested objects that need recursive merging, use `deepMerge()` instead.

```ts title="app/controllers/users_controller.ts"
return inertia.render('users/index', {
  notifications: inertia.defer(() => {
    return fetchNotifications()
  }).deepMerge()
})
```

See also: [Merging props](https://inertiajs.com/merging-props) on the Inertia documentation.

## Link and Form components

Inertia provides `Link` and `Form` components for navigation and form submissions. AdonisJS wraps these components with additional functionality that lets you reference routes by name instead of hardcoding URLs.

Import the components from the AdonisJS package rather than directly from Inertia.

::::tabs

:::tab{title="React"}
```tsx
// [!code --]
import { Form, Link } from '@inertiajs/react'
// [!code ++]
import { Form, Link } from '@adonisjs/inertia/react'
```
:::

:::tab{title="Vue"}
```vue
<script setup>
// [!code --]
import { Form, Link } from '@inertiajs/vue3'
// [!code ++]
import { Form, Link } from '@adonisjs/inertia/vue'
</script>
```
:::

::::

### Creating links

The `Link` component creates navigation links using route names defined in your AdonisJS routes.

```tsx
<Link route="accounts.create">Signup</Link>
<Link route="session.create">Login</Link>
```

### Creating forms

The `Form` component handles form submissions with automatic CSRF protection and error handling.

::::tabs

:::tab{title="React"}
```tsx title="inertia/pages/posts/edit.tsx"
import { Form } from '@adonisjs/inertia/react'

export default function EditPost({ post }) {
  return (
    <Form route="posts.update" method="put" routeParams={{ id: post.id }}>
      {({ errors }) => (
        <>
          <div>
            <label htmlFor="title">Post title</label>
            <input type="text" name="title" id="title" defaultValue={post.title} />
            {errors.title && <div>{errors.title}</div>}
          </div>

          <button type="submit">Update post</button>
        </>
      )}
    </Form>
  )
}
```
:::

:::tab{title="Vue"}
```vue title="inertia/pages/posts/edit.vue"
<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'

defineProps<{ post: { id: number; title: string } }>()
</script>

<template>
  <Form
    route="posts.update"
    method="put"
    :routeParams="{ id: post.id }"
    v-slot="{ errors }"
  >
    <div>
      <label for="title">Post title</label>
      <input type="text" name="title" id="title" :value="post.title" />
      <div v-if="errors.title">{{ errors.title }}</div>
    </div>

    <button type="submit">Update post</button>
  </Form>
</template>
```
:::

::::

When validation fails on the server, AdonisJS automatically adds validation errors to the session flash messages. The Inertia middleware then shares these errors with the frontend, making them available through the `errors` object in your form.

## Shared data

Shared data is available to every page in your application without explicitly passing it from each controller. This is useful for global data like the authenticated user, flash messages, or application settings.

The `InertiaMiddleware` defines what data is shared. This middleware is stored at `app/middleware/inertia_middleware.ts` and contains a `share` method that returns the shared data.

```ts title="app/middleware/inertia_middleware.ts"
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class InertiaMiddleware {
  share(ctx: HttpContext) {
    /**
     * The share method may be called before all middleware runs.
     * For example, during a 404 response. Always treat context
     * properties as potentially undefined.
     */
    const { session, auth } = ctx as Partial<HttpContext>

    const error = session?.flashMessages.get('error')
    const success = session?.flashMessages.get('success')

    return {
      /**
       * Using always() ensures these props are included
       * even during partial reloads.
       */
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      flash: ctx.inertia.always({
        error,
        success,
      }),
      user: ctx.inertia.always(
        auth?.user ? UserTransformer.transform(auth.user) : undefined
      ),
    }
  }
}
```

:::tip
The `share` method may be called before the request passes through all middleware or reaches the controller. This happens when rendering error pages or aborting requests early. Always check that context properties exist before accessing them.
:::

### Accessing shared data

Shared data is automatically included in the props for every page. When you define page props using the `InertiaProps` type helper, it includes both your page-specific props and all shared data.

```tsx title="inertia/pages/posts/index.tsx"
import { InertiaProps } from '~/types'
import { Data } from '~/generated/data'

type PageProps = InertiaProps<{
  posts: Data.Post[]
}>

export default function PostsIndex(props: PageProps) {
  /**
   * Access shared data alongside page-specific props.
   */
  if (props.flash.error) {
    console.log('Error:', props.flash.error)
  }

  return (
    <div>
      {props.user && <p>Welcome, {props.user.name}</p>}
      {/* render posts */}
    </div>
  )
}
```

## CSRF protection

CSRF protection is automatically configured in the Inertia starter kit. The `enableXsrfCookie` option in `config/shield.ts` sets a cookie that Inertia reads and includes with every request. You don't need to manually add CSRF tokens to your forms.

See also: [Shield](../security/securing_ssr_applications.md#csrf-configuration-reference) for more details on CSRF protection.

## Asset versioning

Asset versioning tells the frontend when your JavaScript or CSS bundles have changed, triggering a full page reload instead of a partial update. This ensures users always run the latest version of your frontend code after a deployment.

By default, AdonisJS computes a hash of the `.vite/manifest.json` file (created when you build your frontend assets) and uses it as the version identifier.

You can define custom versioning logic by adding a `version` method to your Inertia middleware.

```ts title="app/middleware/inertia_middleware.ts"
import type { HttpContext } from '@adonisjs/core/http'

export default class InertiaMiddleware {
  version(ctx: HttpContext) {
    /**
     * Return any string that changes when assets change.
     * For example, a git commit hash or build timestamp.
     */
    return 'v1.2.3'
  }
}
```

## Server-side rendering

Server-side rendering (SSR) generates the initial HTML on the server, improving perceived performance and SEO. Enabling SSR requires configuration in both Vite and AdonisJS.

First, enable SSR in your Vite configuration. This tells Vite to create a separate SSR bundle using your `ssr.tsx` or `ssr.vue` entrypoint.

```ts title="vite.config.ts"
export default defineConfig({
  plugins: [
    // [!code highlight:6]
    inertia({
      ssr: {
        enabled: true,
        entrypoint: 'inertia/ssr.tsx'
      }
    }),
  ],
})
```

Then enable SSR in your AdonisJS configuration so the server knows to use the SSR bundle for rendering.

```ts title="config/inertia.ts"
import { defineConfig } from '@adonisjs/inertia'

const inertiaConfig = defineConfig({
  ssr: {
    // [!code highlight:2]
    enabled: true,
    entrypoint: 'inertia/ssr.tsx',
  },
})

export default inertiaConfig
```

## Request lifecycle

Understanding how requests flow through an Inertia application helps when debugging or extending the default behavior.

When a user first visits your application, the request follows this path:

1. The request hits your AdonisJS routes and is handled by a controller
2. The controller calls `inertia.render()` with a page component and props
3. The Inertia middleware's `share()` method adds shared data to the props
4. Since this is the first visit, Inertia returns a full HTML response containing a shell layout with a `div` that holds the serialized page component name and props
5. The frontend bundle boots, reads the props from the `div`, and renders the React or Vue component

For subsequent navigation (clicking links or submitting forms):

1. Inertia intercepts the navigation and makes a `fetch` request with an `X-Inertia` header
2. The request flows through routes, controllers, and middleware as before
3. Since the `X-Inertia` header is present, Inertia returns a JSON response with just the page component name and props
4. The frontend receives the JSON and swaps the current component with the new one, updating the URL without a full page reload

This architecture gives you the developer experience of a traditional server-rendered app with the user experience of a modern SPA.
