# Interview Process for New Documentation

Use this process when creating new AdonisJS documentation from scratch.

## How This Works

Ask questions one at a time to gather:
1. What you're documenting
2. Who your audience is
3. What complexity levels to cover
4. Key concepts and examples
5. Common mistakes to address
6. Related documentation to link

After gathering information, write documentation following priority-ranked guidelines.

---

## Questions to Ask

### 1. Topic Identification

> What feature, concept, or topic are you documenting?
> - Name of the feature (e.g., 'Middleware', 'Controllers')
> - One-sentence description of what it does
> - Why this feature exists (what problem does it solve?)

**Gathering**: Core topic for overview, context for "why" explanations.

### 2. Audience & Complexity

> Who is the primary audience?
> - Beginners, intermediate, or advanced developers?
> - Should this cover multiple skill levels?
> - Prerequisites they should know first?

**Gathering**: Whether to include beginner content, complexity labels needed.

### 3. Core Concept & Structure

> Help me understand the feature's structure:
> - What are the 2-3 most important things developers need to know?
> - Is there a natural progression from simple to complex?
> - What's the simplest working example?

**Gathering**: Key points for overview, how to structure progressive complexity.

### 4. Practical Example

> Let's build a realistic example:
> - What real-world scenario? (Posts, Users, Products—not Foo/Bar)
> - What would the route look like?
> - What would the controller method look like?
> - What file(s) does this code belong in?

**Gathering**: Real-world examples, file paths for code examples.

### 5. Code Walkthrough

> For the simplest version:
> - What imports are needed?
> - What's the complete route definition?
> - What's the complete controller method?
> - What should the model look like (if relevant)?

**Gathering**: All imports for complete code, exact runnable examples.

### 6. Progressive Complexity

> What are the next levels of complexity? For each:
> - What additional capability does it add?
> - Concrete example of when you'd use it?
> - Any new code or configuration required?

**Gathering**: Structure for Basic/Intermediate/Advanced sections.

### 7. Common Mistakes & Gotchas

> What mistakes do developers commonly make?
> - What error or confusion do they experience?
> - Why does this happen?
> - What's the correct approach?

**Gathering**: Content for tip boxes, common mistake anticipation.

### 8. Warnings & Pitfalls

> Are there situations where this could cause problems?
> - What could go wrong?
> - What are the consequences?
> - How do you avoid or fix it?

**Gathering**: Critical warning boxes with Why/What/Solution structure.

### 9. Configuration & Setup

> Is any configuration required before using this?
> - What file(s) need to be configured?
> - What are key configuration options?
> - What are sensible defaults?
> - Any CLI commands to run?

**Gathering**: Setup instructions with file paths, CLI examples.

### 10. Related Concepts

> What other documentation should we link to?
> - Prerequisites readers should understand first?
> - Related features that work well with this?
> - Advanced topics they might explore next?

**Gathering**: See also links, inline contextual links, prerequisites.

### 11. Testing & Verification

> How can developers verify this is working?
> - What should they see when it works?
> - What simple test can they run?
> - Any debugging tips?

**Gathering**: Verification steps, practical testing examples.

### 12. Real-World Use Cases

> What are 2-3 realistic scenarios?
> - Describe the business context
> - Why is this feature the right solution?
> - Any industry-specific examples?

**Gathering**: Real-world context, when-to-use guidance.

### 13. Performance & Best Practices

> Any performance considerations or best practices?
> - What should developers be aware of?
> - Any optimization tips?
> - Common anti-patterns to avoid?

**Gathering**: Best practices content, anti-pattern examples.

---

## After the Interview

Write documentation in phases:

### Phase 1: Critical Elements
1. Overview section with context
2. Complete, runnable code examples with file paths
3. Necessary warnings with solutions
4. "Why" explanations for features
5. Complexity labels if needed
6. All code terms formatted with backticks
7. Confident language throughout

### Phase 2: High Priority Elements
8. Extensive context for complex concepts
9. Change highlighting for code modifications
10. Detailed warnings (Why/What/Solution)
11. Substantial beginner content with steps
12. Technical term definitions
13. Tables for reference information
14. See also sections

### Phase 3: Medium Priority Elements
15. Tips for common mistakes
16. CLI examples with output
17. Progressive complexity examples

### Phase 4: Low Priority Polish
18. Next steps navigation
19. Note boxes for additional context

---

## Tips for Good Responses

- **Be specific**: "Blog posts with title and content" > "some data"
- **Include code details**: "Import Post from #models/post" > "import the model"
- **Describe symptoms**: "They see undefined instead of the model" > "it doesn't work"
- **Think real-world**: "E-commerce product pages" > "generic resource access"
- **Know priorities**: Data loss issues need critical warnings