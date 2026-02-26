# Full Writing Guidelines

Complete priority-ranked patterns for AdonisJS documentation.

## Priority Levels

- **CRITICAL**: Non-negotiable, must be present
- **HIGH**: Essential, should be in most sections
- **MEDIUM**: Recommended when applicable
- **LOW**: Nice-to-have polish

---

## 1. Document Structure

### CRITICAL: Feature Summary Before Overview

After the page title, include bullet points listing topics covered. Then write the Overview explaining concepts without repeating the list.

```markdown
# Exception Handling

This guide covers exception handling in AdonisJS. You will learn how to:

- Use the global exception handler to convert errors into HTTP responses
- Customize error handling for specific error types
- Report errors to logging services
- Create custom exception classes

## Overview

Exception handling provides a centralized system for managing errors during HTTP requests. Instead of wrapping every route handler in try/catch blocks, you can let errors bubble up to a global exception handler.
```

### CRITICAL: Start Major Topics with Overview

Begin all major sections with an Overview that provides context and purpose before technical details.

### MEDIUM: Use Frontmatter

```yaml
---
summary: Learn how to create and register HTTP routes using the AdonisJS router.
---
```

---

## 2. Learning Progression

### CRITICAL: Label Complexity Levels

Mark sections as Basic, Intermediate, or Advanced when content spans skill levels.

```markdown
## Basic concepts (for beginners)

If you're new to middleware, think of them as checkpoints...

## Intermediate: Creating reusable middleware

Once you understand the basics...

## Advanced: Middleware factories with parameters
```

### HIGH: Substantial Beginner Content

Provide step-by-step instructions using `::::steps` format:

```markdown
::::steps

:::step{title="Generate the controller"}
```bash
node ace make:controller posts
```
:::

:::step{title="Add your first action"}
[Complete example with annotations]
:::

::::
```

### LOW: Next Steps Navigation

Point readers to related content at the end.

---

## 3. Error Handling & Gotchas

### CRITICAL: Always Include Solutions

Never show a problem without a fix. Every warning must have a concrete solution.

```markdown
:::warning
Modifications to `ace.js` are lost during builds since the file is rewritten.

Put custom code in `bin/console.ts` instead:

```ts title="bin/console.ts"
// [!code ++]
console.log('Setting up custom environment...')
```
:::
```

### HIGH: Detailed Warnings (Why/What/Solution)

Explain why it's problematic, what happens if ignored, and how to fix it.

### MEDIUM: Anticipate Common Mistakes

```markdown
:::tip
Make sure to call `await next()`. Otherwise middleware logs appear out of sequence.
:::
```

---

## 4. Code Examples

### CRITICAL: No Sandwich Pattern

Never explain code both before AND after. Choose one approach:

**Option 1 (preferred)**: Explanation before, inline comments for details
```markdown
Named middleware receive a third parameter for options. This middleware checks options against user roles, terminates early if unauthorized, or calls next() to continue.

```ts title="app/middleware/authorize_middleware.ts"
export default class AuthorizeMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: AuthOptions) {
    const user = auth.getUserOrFail()
    if (user.role !== options.role) {
      return response.unauthorized()
    }
    await next()
  }
}
```
```

**Option 2**: Only inline comments
```markdown
```ts title="app/middleware/log_middleware.ts"
export default class LogMiddleware {
  async handle({ request, logger }: HttpContext, next: NextFn) {
    /**
     * Capture start time before calling next().
     * This happens in the downstream phase.
     */
    const startTime = process.hrtime()

    /**
     * Call next() to execute remaining middleware.
     */
    await next()

    /**
     * After next() completes, we're in the upstream phase.
     */
    const endTime = process.hrtime(startTime)
    logger.info(`${method} ${uri}: ${status}`)
  }
}
```
```

**WRONG** (sandwich pattern):
```markdown
Let's build a logging middleware.

```ts
const startTime = process.hrtime()
await next()
```

The middleware captures start time before calling next(), then calculates duration.
```

### CRITICAL: Complete, Runnable Examples

Include all imports, show realistic usage, never use pseudo-code.

```ts title="app/controllers/users_controller.ts"
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  async index({ response }: HttpContext) {
    return response.json({ users: [] })
  }
}
```

### CRITICAL: File Paths on Every Code Block

Use `title="path/to/file.ts"` format in the same line as backticks.

### HIGH: Highlight Changes

```ts
import { HttpContext } from '@adonisjs/core/http'
// [!code ++:1]
import { createPostValidator } from '#validators/post_validator'

export default class PostsController {
  async store({ request }: HttpContext) {
    // [!code ++:3]
    const data = request.all()
    const payload = await createPostValidator.validate(data)
    return payload
  }
}
```

### MEDIUM: Progressive Complexity

Start minimal, add complexity incrementally through steps.

---

## 5. Tone & Voice

### CRITICAL: Confidence and Clarity

Use definitive statements: "will", "must", "should". Never hedge with "might", "could", "possibly".

✓ "You must call the `next` method to continue with the request."
✗ "You should probably call the next method if you want to maybe continue..."

### HIGH: Direct Second-Person Address

Use "you" and "your" to speak directly to the reader.

✓ "You can define routes inside the `start/routes.ts` file."
✗ "Routes are defined in the start/routes.ts file."

### MEDIUM: Professional but Approachable

Maintain technical standards while being conversational.

---

## 6. Explanatory Writing

### CRITICAL: Explain "Why" Not Just "What"

Every feature needs purpose and rationale.

```markdown
A middleware has to decide whether to continue with the request, finish the request by sending a response, or raise an exception to abort the request.

The reason it is recommended to bind a class via container is to benefit from the IoC container and its dependency injection layer.
```

### CRITICAL: Natural Prose Flow

Never use labeled sections like "What it does:", "Where it lives:". Write flowing sentences.

✓ "The barrel file is located at `.adonisjs/server/controllers.ts` and is automatically created when you start your development server."

✗ "**Where it lives**: The barrel file is located at..."

### HIGH: No Em Dashes

Use periods, commas, and parentheses instead.

✓ "AdonisJS provides a solid foundation. It scales well for modern apps."
✗ "AdonisJS provides a solid foundation — one that scales well — for modern apps."

### HIGH: Define Terms on First Use

Use bold for emphasis when introducing technical terms.

```markdown
A route is a combination of a **URI pattern** and a **handler** to handle requests for that specific route.
```

---

## 7. Practical Patterns

### HIGH: Real-World Examples

Use realistic scenarios (Posts, Users, Products), not abstract Foo/Bar classes.

### MEDIUM: Include CLI Examples

```bash
node ace make:controller posts
# CREATE: app/controllers/posts_controller.ts
```

---

## 8. Visual Aids

### HIGH: Tables for Comparisons Only

Use tables exclusively for comparing features or showing differences.

```markdown
| Feature | v1.x | v2.x |
|---------|------|------|
| Async support | Callbacks | Promises |
| Type safety | None | TypeScript |
```

### HIGH: Options Component for References

Use `::::options` for parameters, configuration, and properties.

```markdown
::::options

:::option{name="request" dataType="Request"}
Instance of the Request class containing HTTP request information.

```javascript
app.get('/user/:id', (req, res) => {
  console.log(req.request.url);
});
```
:::

:::option{name="response" dataType="Response"}
Instance of the Response class for sending HTTP responses.
:::

::::
```

---

## 9. Cross-Referencing

### HIGH: See Also Sections

Include references to related documentation with descriptive link text.

```markdown
See also: [Make controller command](../references/commands.md#makecontroller)
```

### MEDIUM: Inline Contextual Links

Link to related concepts when first mentioned.

```markdown
AdonisJS creates controller instances using the [IoC container](../concepts/dependency_injection.md).
```

---

## 10. Formatting Conventions

### CRITICAL: Inline Code for Technical Terms

Use backticks for all code, filenames, commands, and technical terms.

✓ "The `HttpContext` class is passed to all route handlers."
✗ "The HttpContext class is passed to all route handlers."

### MEDIUM: Bold for Emphasis

Use sparingly for key terms on first introduction.

---

## 11. Callout Boxes

### CRITICAL: Strategic Warnings

Use `:::warning` for critical issues that cause problems.

### MEDIUM: Tips for Gotchas

Use `:::tip` for best practices and common gotchas.

### LOW: Notes for Context

Use `:::note` for general information.

---

## Priority Checklist

### CRITICAL (Non-Negotiable)
- [ ] Overview section at start
- [ ] No sandwich pattern
- [ ] Complete, runnable code
- [ ] File paths on every code block
- [ ] Solutions with every warning
- [ ] "Why" explanations
- [ ] Natural prose flow
- [ ] Inline code formatting
- [ ] Confident language
- [ ] Strategic warnings

### HIGH (Essential)
- [ ] Extensive context for complex topics
- [ ] Complexity labels
- [ ] Change highlighting
- [ ] Detailed warnings (Why/What/Solution)
- [ ] Second-person address
- [ ] Term definitions
- [ ] Real-world examples
- [ ] Tables for comparisons only
- [ ] See also sections

### MEDIUM (Recommended)
- [ ] Frontmatter
- [ ] Common mistake anticipation
- [ ] Progressive code complexity
- [ ] CLI examples
- [ ] Inline contextual links
- [ ] Bold for key terms
- [ ] Tips for gotchas

### LOW (Nice-to-Have)
- [ ] Next steps navigation
- [ ] Error symptom details
- [ ] Notes for context