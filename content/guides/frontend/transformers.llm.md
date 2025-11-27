# AdonisJS Transformers - LLM Reference

> Optimized for AI coding agents. For human-readable docs, see the full guide.

## Overview

Transformers serialize rich data types (Lucid models, classes, BigInt, DateTime) to JSON for HTTP responses while generating TypeScript types for frontend use.

**Key principle**: HTTP data must be JSON strings. Transformers explicitly control serialization instead of implicit model serialization.

**Use cases**: Inertia apps, REST APIs, mobile backends - anywhere JSON responses are sent.

**Benefits**:
- Type-safe responses with auto-generated TypeScript types
- Explicit field control (security, formatting)
- Frontend/backend type sync
- Composable with relationships

## Basic Setup

### Create Transformer

```bash
node ace make:transformer post
# Creates: app/transformers/post_transformer.ts
```

### Basic Transformer Structure

```ts
// app/transformers/post_transformer.ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import type Post from '#models/post'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return this.pick(this.resource, ['id', 'title', 'content', 'createdAt', 'updatedAt'])
  }
}
```

### Controller Usage

```ts
// app/controllers/posts_controller.ts
import Post from '#models/post'
import type { HttpContext } from '@adonisjs/core/http'
import PostTransformer from '#transformers/post_transformer'

export default class PostsController {
  // Single resource
  async show({ serialize, params }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    return serialize(PostTransformer.transform(post))
  }

  // Collection
  async index({ serialize }: HttpContext) {
    const posts = await Post.all()
    return serialize(PostTransformer.transform(posts))
  }
}
```

## Generated Types

Types auto-generate in `.adonisjs/client/data.d.ts` when dev server runs:

```ts
// .adonisjs/client/data.d.ts
import type { InferData, InferVariants } from '@adonisjs/core/types/transformers'
import type PostTransformer from '#transformers/post_transformer'

export namespace Data {
  export type Post = InferData<PostTransformer>
  
  export namespace Post {
    export type Variants = InferVariants<PostTransformer>
  }
}
```

Frontend usage:

```ts
import { Data } from '~/generated/data'

type Post = Data.Post
```

## Pagination

```ts
// Controller with pagination
async index({ serialize, request }: HttpContext) {
  const page = request.input('page', 1)
  const posts = await Post.query().paginate(page, 20)
  
  const data = posts.all()
  const metadata = posts.getMeta()
  
  return serialize(PostTransformer.paginate(data, metadata))
}
```

Response structure:

```json
{
  "data": [/* transformed items */],
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

## Relationships

### Basic Relationship

```ts
// app/transformers/user_transformer.ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import type User from '#models/user'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, ['id', 'fullName', 'email'])
  }
}
```

```ts
// app/transformers/post_transformer.ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import type Post from '#models/post'
import UserTransformer from '#transformers/user_transformer'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'content']),
      author: UserTransformer.transform(this.resource.author)
    }
  }
}
```

**CRITICAL**: Must eager-load relationships before transforming:

```ts
// Controller - must preload
async show({ serialize, params }: HttpContext) {
  const post = await Post.query()
    .where('id', params.id)
    .preload('author')  // Required!
    .firstOrFail()
  
  return serialize(PostTransformer.transform(post))
}
```

### Conditional Relationships

Use `this.whenLoaded()` for optional relationships:

```ts
toObject() {
  return {
    ...this.pick(this.resource, ['id', 'title']),
    author: UserTransformer.transform(
      this.whenLoaded(this.resource.author)
    )
  }
}
```

Alternative with ternary:

```ts
author: this.resource.author 
  ? UserTransformer.transform(this.resource.author)
  : undefined
```

### Relationship Depth

Default: 1 level deep. Control with `.depth()`:

```ts
toObject() {
  return {
    ...this.pick(this.resource, ['id', 'title']),
    author: UserTransformer
      .transform(this.resource.author)
      .depth(2)  // Serialize nested relationships
  }
}
```

## Variants

Define multiple output shapes for different contexts:

```ts
// app/transformers/post_transformer.ts
import type Post from '#models/post'
import UserTransformer from '#transformers/user_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PostTransformer extends BaseTransformer<Post> {
  // Default variant
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'createdAt']),
      author: UserTransformer.transform(this.resource.author)
    }
  }

  // Detailed variant (can be async)
  async forDetailedView() {
    return {
      ...this.toObject(),
      content: await markdownToHtml(this.resource.content)
    }
  }
}
```

Controller usage:

```ts
async show({ serialize, params }: HttpContext) {
  const post = await Post.query()
    .where('id', params.id)
    .preload('author')
    .firstOrFail()
  
  return serialize(
    PostTransformer.transform(post).useVariant('forDetailedView')
  )
}
```

Frontend variant types:

```ts
import { Data } from '~/generated/data'

type DetailedPost = Data.Post.Variants['forDetailedView']
```

## Dependency Injection

Inject dependencies with `@inject()` decorator:

```ts
import type Post from '#models/post'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return this.pick(this.resource, ['id', 'title'])
  }

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

Dependencies resolve during `serialize()`, not during `transform()`.

## Common Patterns

### Pattern: Model with All Fields

```ts
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

### Pattern: Model with Relationship

```ts
export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title']),
      author: UserTransformer.transform(this.resource.author)
    }
  }
}
```

### Pattern: Multiple Variants

```ts
export default class PostTransformer extends BaseTransformer<Post> {
  // List view - minimal data
  toObject() {
    return this.pick(this.resource, ['id', 'title', 'createdAt'])
  }

  // Detail view - full data
  async forDetailedView() {
    return {
      ...this.toObject(),
      content: this.resource.content,
      author: UserTransformer.transform(this.resource.author)
    }
  }

  // Dropdown - minimal data
  forDropdown() {
    return this.pick(this.resource, ['id', 'title'])
  }
}
```

### Pattern: Computed Fields

```ts
toObject() {
  return {
    ...this.pick(this.resource, ['id', 'title']),
    excerpt: this.resource.content.substring(0, 100),
    wordCount: this.resource.content.split(' ').length
  }
}
```

### Pattern: Authorization Data

```ts
@inject()
async forDetailedView({ auth }: HttpContext) {
  const isOwner = auth.user?.id === this.resource.userId
  const isAdmin = auth.user?.role === 'admin'
  
  return {
    ...this.toObject(),
    content: this.resource.content,
    can: {
      edit: isOwner || isAdmin,
      delete: isOwner || isAdmin,
      publish: isAdmin
    }
  }
}
```

## Quick Reference

### File Locations
- Transformers: `app/transformers/`
- Generated types: `.adonisjs/client/data.d.ts`
- Import alias: `#transformers/`

### Key Methods
- `this.pick(resource, fields)` - Select specific fields
- `this.resource` - Access the model instance
- `this.whenLoaded(relationship)` - Guard against undefined relationships
- `transform(data)` - Transform resource or collection
- `paginate(data, meta)` - Transform paginated results
- `useVariant(name)` - Use specific variant
- `.depth(n)` - Set relationship depth

### Naming Conventions
- Transformers: `<Model>Transformer` (e.g., `PostTransformer`)
- Variants: `for<Purpose>` (e.g., `forDetailedView`, `forDropdown`)
- Files: `<model>_transformer.ts` (e.g., `post_transformer.ts`)

### Type Imports
```ts
// Frontend
import { Data } from '~/generated/data'

// Use base type
type Post = Data.Post

// Use variant type
type DetailedPost = Data.Post.Variants['forDetailedView']
```

### Controller Pattern
```ts
async action({ serialize }: HttpContext) {
  const data = await Model.query().preload('relation')
  return serialize(Transformer.transform(data).useVariant('optional'))
}
```

## Important Notes

- **NOT DTOs**: Transformers are for output only, not input validation
- **Eager load required**: Relationships must be preloaded before transformation
- **One transformer per entity**: Each model/class should have its own transformer
- **Composable**: Transformers can reference other transformers
- **Auto-types**: Types generate automatically on dev server start
- **Depth default**: Relationships serialize 1 level deep by default
- **Variants can be async**: Use for computed/async operations

## Error Prevention

If you see: `"Cannot transform undefined values. Use this.whenLoaded to guard against undefined values"`
- Cause: Relationship not eager-loaded
- Fix: Add `.preload('relationName')` in controller query
- Fix: Guard relation `Transformer.transform` call with `this.whenLoaded`
- Ask: Which fix to apply

## Type Generation

Types generate when running:
```bash
node ace serve --hmr
```

No configuration needed. Types update automatically when transformers change.