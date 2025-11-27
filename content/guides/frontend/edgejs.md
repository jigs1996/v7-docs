---
summary: Learn how to use Edge templates in AdonisJS applications to render HTML on the server-side.
---

# Edge Templates

This guide covers using Edge templates in AdonisJS applications. You will learn how to render templates from controllers, pass data to templates, work with layouts and components, use the pre-built components from the Hypermedia starter kit, and debug template issues.

## Overview

Edge is a server-side templating engine for Node.js that allows you to compose HTML markup on the server and send the final static HTML to the browser. Since templates execute entirely on the server-side, they can tap into core framework features like authentication, authorization checks, and the translations system.

When you create a Hypermedia application in AdonisJS, Edge comes pre-configured and ready to use. Templates are stored in the `resources/views` directory with the `.edge` file extension, and you render them from your route handlers or controllers using the `view` property from the HTTP context.

Edge has comprehensive documentation at [edgejs.dev](https://edgejs.dev), which covers the template syntax, components system, and all available features in detail. This guide focuses specifically on using Edge within AdonisJS applications and introduces the pre-built components included in the Hypermedia starter kit.

## Your first template

Let's create a simple page that displays a list of blog posts. This example demonstrates the fundamental workflow of rendering templates in AdonisJS.

First, create a template file using the Ace command.

```bash
node ace make:view pages/posts/index
# CREATE: resources/views/pages/posts/index.edge
```

The template file is created inside `resources/views/pages/posts/index.edge`. Open this file and add the following content.

```edge title="resources/views/pages/posts/index.edge"
@layout()
  @each(post in posts)
    <div>
      <h2>
        {{ post.title }}
      </h2>
      <div>
        <p>{{{ excerpt(post.content, 280) }}}</p>
      </div>
    </div>
  @end
@end
```

A few important things to understand about this template:

- The `@layout()` component wraps your content with a complete HTML document structure (including `<html>`, `<head>`, and `<body>` tags). We'll explore layouts in detail later in this guide.

- The `@each` tag loops over the `posts` array and renders the content for each post. Edge provides several tags like `@if`, `@else`, and `@elseif` for writing logic in templates. You can learn about all available tags in the [Edge syntax reference](#).

- The double curly braces `{{ }}` evaluate and output a JavaScript expression. The triple curly braces `{{{ }}}` do the same but don't escape HTML, which is useful for rendering rich content.

Now, create a route and controller to render this template. Define the route in your routes file.

```ts title="start/routes.ts"
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('posts', [controllers.PostsController, 'index'])
```

Create the controller:

```ts title="app/controllers/posts_controller.ts"
import Post from '#models/post'
import type { HttpContext } from '@adonisjs/core/http'

export default class PostsController {
  async index({ view }: HttpContext) {
    /**
     * Render the template located at resources/views/pages/posts/index.edge
     * The first parameter is the template path (relative to resources/views)
     * The second parameter is the template state (data to share with the template)
     */
    return view.render('pages/posts/index', {
      posts: await Post.all(),
    })
  }
}
```

You can also render templates directly from routes without using a controller.

```ts title="start/routes.ts"
import router from '@adonisjs/core/services/router'

/**
 * The router.on().render() shorthand renders a template directly.
 * The first parameter is the template path.
 */
router.on('/').render('pages/home')
```

Visit `http://localhost:3333/posts` in your browser to see the rendered page.

## Understanding template state

The data object you pass to `view.render()` is called the **template state**. All properties in this object become available as variables in your template.

In addition to the data you explicitly pass, AdonisJS automatically shares certain globals with every template:

- The `request` object for accessing request data
- The `auth` object for checking authentication status
- Edge helpers like `excerpt()`, `truncate()`, and route helpers

You can view all available helpers and global properties in the [Edge reference guide](#).

## Template syntax refresher

Edge uses a combination of curly braces and tags to add dynamic behavior to your templates. Here's a quick refresher of the most common syntax patterns:

**Outputting variables:**
```edge
{{ post.title }}
```

**Outputting unescaped HTML:**
```edge
{{{ post.content }}}
```

**Conditionals:**
```edge
@if(user)
  <p>Welcome back, {{ user.name }}</p>
@else
  <p>Please log in</p>
@end
```

**Loops:**
```edge
@each(post in posts)
  <h2>{{ post.title }}</h2>
@end
```

**Evaluating JavaScript expressions:**
```edge
{{ post.createdAt.toFormat('dd LLL yyyy') }}
{{ posts.length > 0 ? 'Posts available' : 'No posts yet' }}
```

For complete coverage of Edge's template syntax, including advanced features like partials, slots, and custom tags, refer to the [Edge syntax reference](#).

## Working with layouts and components

The `@layout()` component you saw in the first example wraps your page content with a complete HTML document structure. This component is stored at `resources/views/components/layout.edge` and contains the standard HTML boilerplate:
```edge title="resources/views/components/layout.edge"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
</head>
<body>
  {{{ await $slots.main() }}}
</body>
</html>
```

The `$slots.main()` method call renders whatever content you place between the opening and closing `@layout()` tags in your page templates. This is Edge's slots feature, which allows components to accept content from their consumers.

### Creating components

Components in Edge are reusable template fragments stored in the `resources/views/components` directory. Any template file in this directory becomes available as an Edge tag.

For example, if you create a file at `resources/views/components/card.edge`:
```edge title="resources/views/components/card.edge"
<div class="card">
  {{{ await $slots.main() }}}
</div>
```

You can use it in your templates like this:
```edge
@card()
  <h2>Card title</h2>
  <p>Card content</p>
@end
```

Components can accept props (parameters) and have multiple named slots for more complex compositions. For a complete guide to building and using components, see the [Edge components guide](#).

## Starter kit components

The Hypermedia starter kit includes a collection of pre-built components for common UI patterns like forms, alerts, and form fields. These components are unstyled and render semantic HTML that you can style with your own CSS classes.

All components accept unknown props and apply them as HTML attributes to the rendered element, making it easy to add classes, data attributes, or other HTML attributes.

### Alert components

Alert components display notification messages with optional auto-dismiss functionality.

```edge
@alert.root({ variant: 'destructive', autoDismiss: true })
  @!alert.title({ text: 'Unauthorized' })
  @!alert.description({ text: 'You are not allowed to access this page' })
@end
```

::::options

:::option{name="@alert.root" dataType="components/alert/root.edge"}

Container that defines context for child components. The component accepts the `variant` and `autoDismiss` props.

:::

:::option{name="@alert.title" dataType="components/alert/title.edge"}

Displays the alert title. Accepts the title via the `text` prop or as the main slot.

:::

:::option{name="@alert.description" dataType="components/alert/description.edge"}

Displays the alert description. Accepts the title via the `text` prop or as the main slot.

:::

::::

### Form component

The form component renders an HTML form with an automatically included CSRF token for security.

| Component | Location | Props | Description |
|-----------|----------|-------|-------------|
| `@form` | `components/form/index.edge` | `action`, `method`, `route`, `routeParams`, `routeOptions` | Renders a form with CSRF protection |

**Props details:**
- `action` - The form action URL
- `method` - The HTTP method (supports `GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- `route` - Compute the action URL from a route name
- `routeParams` - Parameters for the route
- `routeOptions` - Additional options for URL generation (like query strings)

**Usage example:**
```edge
@form({ route: 'posts.update', method: 'PUT', routeParams: [post.id] })
  {{-- Form fields go here --}}
@end
```

### Form field components

Field components provide structure for form inputs with labels and error messages.

| Component | Location | Props | Description |
|-----------|----------|-------|-------------|
| `@field.root` | `components/field/root.edge` | `name` | Container that defines context for label, input, and error |
| `@field.label` | `components/field/label.edge` | `text` or main slot | Renders the field label |
| `@field.error` | `components/field/error.edge` | None | Displays validation errors for the field |

**Usage example:**
```edge
@field.root({ name: 'email' })
  @!field.label({ text: 'Email' })
  @!input.control({ type: 'email', autocomplete: 'email' })
  @!field.error()
@end
```

The `@field.error` component automatically displays validation errors associated with the field name.

### Form controls

Form control components render standard HTML input elements with proper integration for validation errors and old input values.

| Component | Location | Props | Description |
|-----------|----------|-------|-------------|
| `@input.control` | `components/input/control.edge` | Standard HTML input attributes | Renders an `<input>` element |
| `@textarea.control` | `components/textarea/control.edge` | Standard HTML textarea attributes | Renders a `<textarea>` element |
| `@select.control` | `components/select/control.edge` | `options` array + standard select attributes | Renders a `<select>` element |

All form controls must be used within a `@field.root` component.

**Usage examples:**
```edge
@field.root({ name: 'email' })
  @!input.control({ type: 'email', autocomplete: 'email' })
@end

@field.root({ name: 'state' })
  @!select.control({
    options: states.map((state) => {
      return {
        name: state.name,
        value: state.value
      }
    })
  })
@end

@field.root({ name: 'bio' })
  @!textarea.control()
@end
```

### Checkbox components

Checkbox components render checkbox inputs with proper grouping for multiple selections.

| Component | Location | Props | Description |
|-----------|----------|-------|-------------|
| `@checkbox.group` | `components/checkbox/group.edge` | `name` | Container for checkbox controls with a shared name |
| `@checkbox.control` | `components/checkbox/control.edge` | Standard HTML checkbox attributes | Renders a checkbox input |

**Usage example:**
```edge
@checkbox.group({ name: 'services' })
  @field.root({ id: 'design' })
    @!checkbox.control({ value: 'design' })
    @!field.label({ text: 'Design' })
  @end

  @field.root({ id: 'development' })
    @!checkbox.control({ value: 'development' })
    @!field.label({ text: 'Development' })
  @end

  @field.root({ id: 'marketing' })
    @!checkbox.control({ value: 'marketing' })
    @!field.label({ text: 'Marketing' })
  @end
@end
```

### Radio components

Radio components render radio button inputs for single-selection scenarios.

| Component | Location | Props | Description |
|-----------|----------|-------|-------------|
| `@radio.group` | `components/radio/group.edge` | `name` | Container for radio controls with a shared name |
| `@radio.control` | `components/radio/control.edge` | Standard HTML radio attributes | Renders a radio input |

**Usage example:**
```edge
@radio.group({ name: 'payment_plan' })
  @field.root({ id: 'free' })
    @!radio.control({ value: 'free' })
    @!field.label({ text: 'Free' })
  @end

  @field.root({ id: 'pro' })
    @!radio.control({ value: 'pro' })
    @!field.label({ text: 'Pro $29/month' })
  @end

  @field.root({ id: 'enterprise' })
    @!radio.control({ value: 'enterprise' })
    @!field.label({ text: 'Custom pricing' })
  @end
@end
```

### Button component

The button component renders a button element with optional text content.

| Component | Location | Props | Description |
|-----------|----------|-------|-------------|
| `@button` | `components/button.edge` | `text` or main slot, standard HTML button attributes | Renders a button element |

**Usage example:**
```edge
@!button({ text: 'Sign up', type: 'submit' })
```

You can customize this component to accept additional props for variants (primary, secondary) and sizes (small, large) when implementing your design system.

### Link component

The link component renders an anchor tag with support for route-based URL generation.

| Component | Location | Props | Description |
|-----------|----------|-------|-------------|
| `@link` | `components/link.edge` | `route`, `routeParams`, `text` or main slot | Renders an `<a>` element with route support |

**Usage examples:**
```edge
@!link({ route: 'posts.show', routeParams: [post.id], text: 'View post' })

@link({ route: 'posts.show', routeParams: [post.id] })
  <span>View post</span>
  <svg>{{-- Icon --}}</svg>
@end
```

### Avatar component

The avatar component renders user avatars using either an image URL or text initials.

| Component | Location | Props | Description |
|-----------|----------|-------|-------------|
| `@avatar` | `components/avatar.edge` | `src` or `initials` | Renders an avatar image or initials |

**Usage examples:**
```edge
{{-- Render avatar with image --}}
@!avatar({ src: user.avatarUrl })

{{-- Render avatar with initials --}}
@!avatar({ initials: user.initials })
```

## Debugging templates

When working with templates, you may need to inspect the data available in your template or debug why certain values aren't displaying as expected. Edge provides the `@dump` tag for this purpose.

The `@dump` tag pretty-prints the value of a variable, making it easy to inspect data structures:
```edge
@dump(posts)
```

To view the entire template state (all variables available in your template), use:
```edge
@dump(state)
```

The output appears in your rendered HTML, showing the structure and values of your data. During development, templates automatically reload when you make changes, so you'll see updates immediately in your browser without restarting the server.

## Configuration

Edge comes pre-configured in Hypermedia applications and works out of the box. However, you can customize Edge by creating a preload file if you need to register custom helpers, tags, or plugins.

Create a preload file for Edge configuration:
```bash
node ace make:preload view
```

This creates a preload file where you can customize Edge before your application starts. Inside this file, you can register Edge globals, plugins, and custom tags.

If you need to customize the directory where templates are stored, you can modify the `directories` option in your `adonisrc.ts` file. See the [AdonisRC reference guide](#) for more details on configuration options.

## See also

- [Edge syntax reference](#) - Learn about all template syntax features, tags, and expressions
- [Edge components guide](#) - Deep dive into building and composing components
- [Edge reference guide](#) - View all available helpers and global properties in Edge templates
- [Edge documentation](https://edgejs.dev) - Complete Edge documentation with advanced features and patterns
