# Transformers

This guide covers data transformation in AdonisJS applications. You will learn how transformers serialize rich data types like classes, BigInt, and Lucid models to JSON while retaining type information, how to shape API responses by including or excluding fields, how to use transformer variants for different output contexts, how to handle relationships and pagination, and how the generated TypeScript types eliminate duplicate type definitions between your backend and frontend.

## Overview

Transformers provide a structured way to convert your backend data into JSON responses for HTTP clients. When building APIs or full-stack applications, the data structures you work with in your backend (Lucid models, custom classes, DateTime objects) cannot be sent directly over HTTP—everything must be serialized to JSON first, which is fundamentally a string format.

Rather than letting AdonisJS handle serialization implicitly, transformers give you explicit control over this process. You define exactly which fields to include, how to format them, and what shape your responses should take. This approach offers several benefits: you can keep sensitive information out of responses, apply consistent formatting rules across your application, shape responses around your frontend's needs rather than your database structure, and generate TypeScript types that your frontend can reference directly.

If you're building an Inertia application or any API that returns JSON data, we highly recommend using transformers for all HTTP responses. The generated TypeScript types eliminate the need to maintain duplicate type definitions, ensuring your frontend and backend stay in sync automatically.

### Understanding JSON serialization

Before diving into transformers, it's important to understand why they exist. When you send data over HTTP, everything must be converted to a string—specifically, a JSON string. This means rich data types from your programming language cannot be transmitted directly.

Consider a Lucid model with a `createdAt` field that's a Luxon DateTime object. In JavaScript/TypeScript, this is a complex object with methods like `.toISO()` and `.diff()`. But when sent over HTTP, it must become a simple string like `"2024-01-15T10:30:00.000Z"`. Similarly, a BigInt value or a custom class instance must be converted to a JSON-compatible format.

Without explicit serialization control, you might accidentally expose sensitive data, send inconsistent date formats, or include internal implementation details that your frontend doesn't need. Transformers solve this by requiring you to be explicit about what gets serialized and how.

## Creating your first transformer

Let's start with a practical example. Suppose you have a Post model and need to return post data to your frontend. First, here's what the Post model looks like:

```ts title="app/models/post.ts"
import User from '#models/user'
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Post extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare title: string

  @column()
  declare content: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare author: BelongsTo<typeof User>
}
```

::::steps

:::step{title="Generate the transformer"}

Run the following command to create a transformer for posts:

```bash
node ace make:transformer post
# CREATE: app/transformers/post_transformer.ts
```

This creates a file in the `app/transformers` directory with the following default structure:

```ts title="app/transformers/post_transformer.ts"
import { BaseTransformer } from '@adonisjs/core/transformers'
import Post from '#models/post'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return this.pick(this.resource, ['id'])
  }
}
```

The transformer extends `BaseTransformer` with a generic type parameter specifying what it transforms (in this case, `Post`). The `toObject()` method defines the default output shape. The `this.resource` property gives you access to the Post instance being transformed.

:::

:::step{title="Define the output shape"}

The `toObject()` method determines what fields appear in your JSON response. The `this.pick()` helper selects specific fields from the model. Let's expand our transformer to include the fields we want:

```ts title="app/transformers/post_transformer.ts"
import { BaseTransformer } from '@adonisjs/core/transformers'
import type Post from '#models/post'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'title', 
      'content',
      'createdAt',
      'updatedAt'
    ])
  }
}
```

This transformer explicitly includes only these five fields. Any other fields on the Post model (like internal metadata or sensitive data) will be excluded from the output.

:::

:::step{title="Use the transformer in your controller"}

Now let's use this transformer in a controller to return data. First, define your routes:

```ts title="start/routes.ts"
import router from '@adonisjs/core/services/router'

const PostsController = () => import('#controllers/posts_controller')

router.get('posts', [PostsController, 'index'])
router.get('posts/:id', [PostsController, 'show'])
```

Then create the controller that uses your transformer:

```ts title="app/controllers/posts_controller.ts"
import Post from '#models/post'
import type { HttpContext } from '@adonisjs/core/http'
import PostTransformer from '#transformers/post_transformer'

export default class PostsController {
  async index({ serialize }: HttpContext) {
    const posts = await Post.all()
    return serialize(PostTransformer.transform(posts))
  }

  async show({ serialize, params }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    return serialize(PostTransformer.transform(post))
  }
}
```

The pattern is straightforward: call `PostTransformer.transform()` with your data, then wrap the result in the `serialize()` helper from the HTTP context. The `serialize()` function handles the actual JSON conversion and sends the response.

The same transformer works for both a single post and a collection of posts. AdonisJS automatically detects whether you're transforming one item or many and structures the output accordingly.

:::

:::step{title="Understanding the generated types"}

When you start your development server with `node ace serve --hmr`, AdonisJS automatically generates TypeScript types for your transformers. These types are stored in `.adonisjs/client/data.d.ts`:

```ts title=".adonisjs/client/data.d.ts"
import type { InferData, InferVariants } from '@adonisjs/core/types/transformers'
import type PostTransformer from '#transformers/post_transformer'

export namespace Data {
  export type Post = InferData<PostTransformer>
  
  export namespace Post {
    export type Variants = InferVariants<PostTransformer>
  }
}
```

Your frontend code can now import and use these types. In Inertia applications, there's a pre-configured alias that makes this convenient:

```ts
import { Data } from '~/generated/data'

type Post = Data.Post
```

This means your frontend automatically knows the exact shape of data coming from your API. If you add or remove fields in your transformer, the TypeScript types update automatically when the dev server reloads. You never need to manually maintain duplicate type definitions.

:::
::::

## Resource items and collections

Transformers handle both single resources and collections automatically. When you call `PostTransformer.transform()`, it returns either a `ResourceItem` or `ResourceCollection` depending on what you pass in:

```ts title="app/controllers/posts_controller.ts"
import Post from '#models/post'
import type { HttpContext } from '@adonisjs/core/http'
import PostTransformer from '#transformers/post_transformer'

export default class PostsController {
  // Returns a ResourceItem (single post)
  async show({ serialize, params }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    return serialize(PostTransformer.transform(post))
  }

  // Returns a ResourceCollection (array of posts)
  async index({ serialize }: HttpContext) {
    const posts = await Post.all()
    return serialize(PostTransformer.transform(posts))
  }
}
```

The serialized output structure differs slightly between items and collections. A single item returns your transformed object directly, while a collection wraps the items in a `data` array. Both go through the same `toObject()` method you defined in your transformer.

## Paginating data

When working with large datasets, you'll typically paginate results. Lucid's query builder provides a `paginate()` method that returns both the data rows and pagination metadata. Transformers have a dedicated method for handling paginated responses:

```ts title="app/controllers/posts_controller.ts"
import Post from '#models/post'
import type { HttpContext } from '@adonisjs/core/http'
import PostTransformer from '#transformers/post_transformer'

export default class PostsController {
  async index({ serialize, request }: HttpContext) {
    const page = request.input('page', 1)
    const posts = await Post.query().paginate(page, 20)
    
    const data = posts.all()
    const metadata = posts.getMeta()
    
    return serialize(PostTransformer.paginate(data, metadata))
  }
}
```

The `PostTransformer.paginate()` method takes two arguments: the array of data to transform and the pagination metadata. The resulting JSON response includes both the transformed data and the pagination information:

```json
{
  "data": [
    {
      "id": 1,
      "title": "First Post",
      "content": "...",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 100,
    "perPage": 20,
    "currentPage": 1,
    "lastPage": 5,
    "firstPage": 1,
    "firstPageUrl": "/?page=1",
    "lastPageUrl": "/?page=5",
    "nextPageUrl": "/?page=2",
    "previousPageUrl": null
  }
}
```

Your frontend can use the `meta` object to build pagination controls while the `data` array contains the transformed posts.

## Working with relationships

Transformers can include related data by composing with other transformers. Each entity in your application should have its own transformer, and these transformers can reference each other when including relationships.

### Basic relationship inclusion

First, let's create a transformer for the User model:

```ts title="app/transformers/user_transformer.ts"
import { BaseTransformer } from '@adonisjs/core/transformers'
import type User from '#models/user'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'fullName',
      'email',
      'createdAt',
      'updatedAt'
    ])
  }
}
```

Now you can include the post's author in the PostTransformer by using the UserTransformer:

```ts title="app/transformers/post_transformer.ts"
import { BaseTransformer } from '@adonisjs/core/transformers'
import type Post from '#models/post'
import UserTransformer from '#transformers/user_transformer'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'title',
        'content',
        'createdAt',
        'updatedAt'
      ]),
      author: UserTransformer.transform(this.resource.author)
    }
  }
}
```

Relationships can only appear as top-level properties in your transformer output. You compose transformers by calling their `transform()` method with the related model instance.

:::note

**Critical requirement**: You must eager-load relationships before transforming them.

**Why this matters**: Transformers do not issue any database queries. They only work with data you've already loaded. If you forget to eager-load a relationship and try to transform it, you'll access undefined data.

**What happens if ignored**: You'll see an error:

```
"Cannot transform undefined values. Use this.whenLoaded to guard against undefined values."
```

**The solution**: Always eager-load relationships in your controller before transforming:

```ts title="app/controllers/posts_controller.ts"
async show({ serialize, params }: HttpContext) {
  const post = await Post.query()
    .where('id', params.id)
    .preload('author')  // Must eager-load before transforming
    .firstOrFail()
  
  return serialize(PostTransformer.transform(post))
}
```

:::

### Conditional relationships

Sometimes a relationship might or might not be loaded depending on the request context. For example, you might only eager-load the author for specific endpoints. In these cases, you need to guard against undefined values explicitly.

The `this.whenLoaded()` helper checks if a relationship has been loaded before attempting to transform it:

```ts title="app/transformers/post_transformer.ts"
import { BaseTransformer } from '@adonisjs/core/transformers'
import type Post from '#models/post'
import UserTransformer from '#transformers/user_transformer'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'title',
        'content',
        'createdAt',
        'updatedAt'
      ]),
      author: UserTransformer.transform(
        this.whenLoaded(this.resource.author)
      )
    }
  }
}
```

Now if the `author` relationship hasn't been loaded, the transformer won't throw an error. The `author` field will simply be omitted from the output. You can also use a ternary operator if you prefer more explicit control:

```ts
author: this.resource.author 
  ? UserTransformer.transform(this.resource.author)
  : undefined
```

### Controlling relationship depth

By default, transformers serialize relationships up to one level deep. This prevents accidentally over-fetching nested data that your frontend might not need. For example, if a User has Posts and each Post has Comments, only the first level (User → Posts) would be serialized by default.

You can control this depth manually using the `.depth()` method:

```ts title="app/transformers/post_transformer.ts"
toObject() {
  return {
    ...this.pick(this.resource, ['id', 'title', 'content']),
    author: UserTransformer
      .transform(this.resource.author)
      .depth(2)  // Now serializes user → posts if eager-loaded
  }
}
```

With `.depth(2)`, if you eager-load nested relationships, they'll be included in the transformation. This gives you fine-grained control over how deep the serialization goes for each relationship.

The depth limit serves as a safeguard against circular references and unnecessary data transfer. Most UIs don't display deeply nested circular data (like User → Posts → User → Posts), so the default prevents sending this redundant information. Adjust the depth only when you specifically need nested data in your frontend.

## Using variants

A single transformer can produce different output shapes for different contexts. This is useful when the same resource needs to be displayed differently across your application—for example, a lightweight version for list views and a detailed version for single-item views.

### Defining variants

Variants are defined by creating additional methods in your transformer alongside `toObject()`. These methods can be named anything, but we recommend a consistent convention like `for<Purpose>` to make their intent clear:

```ts title="app/transformers/post_transformer.ts"
import type Post from '#models/post'
import UserTransformer from '#transformers/user_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PostTransformer extends BaseTransformer<Post> {
  /**
   * Default variant for listing posts
   */
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'createdAt', 'updatedAt']),
      author: UserTransformer.transform(this.resource.author)
    }
  }

  /**
   * Detailed variant for showing a single post
   * Includes the full content with markdown converted to HTML
   */
  async forDetailedView() {
    return {
      ...this.toObject(),
      content: await markdownToHtml(this.resource.content)
    }
  }
}
```

The default `toObject()` method returns basic fields suitable for displaying a list of posts. The `forDetailedView()` variant extends this with additional computed data—in this case, converting markdown content to HTML. Notice that variant methods can be async if they need to perform asynchronous operations.

You can reuse the default variant by calling `this.toObject()` and spreading its result, then adding or overriding specific fields. This keeps your variants DRY and ensures consistency.

### Using variants in controllers

To use a variant, call the `.useVariant()` method on the transformed resource:

```ts title="app/controllers/posts_controller.ts"
import Post from '#models/post'
import type { HttpContext } from '@adonisjs/core/http'
import PostTransformer from '#transformers/post_transformer'

export default class PostsController {
  /**
   * List all posts using the default variant
   */
  async index({ serialize }: HttpContext) {
    const posts = await Post.query().preload('author')
    return serialize(PostTransformer.transform(posts))
  }

  /**
   * Show a single post using the detailed variant
   */
  async show({ serialize, params }: HttpContext) {
    const post = await Post.query()
      .where('id', params.id)
      .preload('author')
      .firstOrFail()
    
    return serialize(
      PostTransformer.transform(post).useVariant('forDetailedView')
    )
  }
}
```

The `.useVariant()` method takes the name of the variant method as a string. When the response is serialized, it will call `forDetailedView()` instead of the default `toObject()`.

### Variant types in the frontend

The generated TypeScript types include definitions for all your variants. Your frontend code can specify which variant type it expects:

```ts
import { Data } from '~/generated/data'
import { InertiaProps } from '~/types'

export default function ShowPost(
  props: InertiaProps<{
    post: Data.Post.Variants['forDetailedView']
  }>
) {
  // TypeScript knows this post includes the 'content' field
  // from the forDetailedView variant
}
```

Access variant types using `Data.<Resource>.Variants['<variantName>']`. This ensures your frontend components receive properly typed props that match the exact shape returned by your API for that specific variant.

## Dependency injection (Advanced)

Transformer methods can inject dependencies from AdonisJS's IoC container using the `@inject()` decorator. This is useful when you need access to services or context information during transformation.

### Injecting HttpContext

A common use case is injecting the `HttpContext` to access the currently authenticated user. This allows you to compute authorization permissions or user-specific data during transformation:

```ts title="app/transformers/post_transformer.ts"
import type Post from '#models/post'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'createdAt', 'updatedAt']),
      author: UserTransformer.transform(this.resource.author)
    }
  }

  /**
   * Detailed variant with authorization checks
   */
  @inject()
  async forDetailedView({ auth }: HttpContext) {
    return {
      ...this.toObject(),
      content: await markdownToHtml(this.resource.content),
      can: {
        view: true,
        edit: auth.user?.id === this.resource.userId,
        delete: auth.user?.id === this.resource.userId
      }
    }
  }
}
```

The `@inject()` decorator tells AdonisJS to resolve dependencies for this method. You can destructure properties from the injected `HttpContext`, such as `auth`, `request`, or any other context property you need.

This pattern keeps authorization logic close to your data transformation, making it easy to include user-specific metadata in your responses. The frontend receives not just the data, but also information about what actions the current user can perform on that data.

### How dependency injection works

When you call `PostTransformer.transform(post)`, it returns a `ResourceItem` or `ResourceCollection` object. These objects don't immediately execute your transformer methods. Instead, when you pass them to `serialize()`, that's when the IoC container resolves dependencies and calls your transformer methods with the injected values.

This means dependency injection happens automatically during the serialization phase in your controller. You don't need to manually pass the `HttpContext` or other dependencies—the framework handles this for you.

## Important distinctions

### Transformers are not DTOs

It's important to understand that transformers are not Data Transfer Objects (DTOs) for request validation. They serve a different purpose:

- **DTOs define input contracts**: They validate and shape data coming into your application from requests
- **Transformers define output contracts**: They shape data going out from your application in responses

Don't use transformers to validate or transform request data. Use AdonisJS's validation system for that purpose. Transformers are exclusively for serializing your backend data structures into JSON responses for clients.

### When to use transformers

Use transformers in any situation where your backend returns JSON data to a client:

- **Inertia applications**: Full-stack TypeScript apps where both frontend and backend live in the same codebase
- **REST APIs**: APIs consumed by separate frontend applications (React, Vue, Angular SPAs)
- **Mobile APIs**: Backends serving mobile applications
- **Any JSON response**: Anywhere you're sending structured data over HTTP

The generated TypeScript types are most useful in Inertia applications or full-stack TypeScript monorepos where your frontend can directly import types from your backend. Mobile clients typically won't leverage the generated types, but they still benefit from the consistent, well-shaped JSON responses that transformers provide.
