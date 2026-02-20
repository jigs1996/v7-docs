---
description: Understand how AdonisJS approaches frontend development and the different options available for building full-stack applications.
---

# Frontend in AdonisJS

Let's try to understand how AdonisJS approaches frontend in its full-stack paradigm and how it differs from the mainstream approach of meta-frameworks. We will look at things through a clear lens without getting lost in a gazillion acronyms commonly used in the frontend ecosystem.

## Overview

AdonisJS takes a fundamentally different approach to frontend compared to what you might expect from meta-frameworks.

Meta-frameworks place their main emphasis on the frontend and doing more complex things on the client-side, often treating the backend as an afterthought or offloading it to third-party services. AdonisJS is the opposite: it's a backend-first framework that stays minimal by default on the frontend.

This means AdonisJS doesn't force you into a specific frontend paradigm. Instead, it provides you with the flexibility to choose the frontend approach that best fits your application's needs. The framework gives you a solid backend foundation with features like authentication, authorization, rate limiting, and caching built-in, so you can own your infrastructure rather than outsourcing critical functionality to third-party services.

## What NOT to expect

If you're coming from meta-frameworks, there are some things you should not expect from AdonisJS:

- **No file-based routing**: Routes are explicitly defined in your route files, not inferred from your file structure.
- **No compiler magic with "use" statements**: You won't find magical directives that blur the line between server and client code.
- **No blurry boundaries between frontend and backend**: AdonisJS maintains strict separation between frontend and backend codebases. There is no mixing of server and client code in the same files, and you work with clear API contracts when these layers need to communicate.

This separation is intentional. It provides clarity about where code executes, makes debugging straightforward, and allows teams to work with well-defined boundaries.
## The view layer in AdonisJS

In the MVC (Model-View-Controller) architecture that AdonisJS follows, the view layer is what handles your frontend. Unlike frameworks that lock you into a specific frontend technology, AdonisJS doesn't prescribe how you should build this layer.

You have complete flexibility to choose the frontend approach that makes sense for your application. This flexibility is by design, not a lack of opinion. The framework recognizes that different applications have different frontend needs, and forcing everyone into a single approach would be counterproductive.

By staying minimal on the frontend by default, AdonisJS allows you to start with zero build tools for simple applications. When you need more sophisticated frontend tooling, you can introduce it incrementally. Even when you add tools like Vite, the setup remains simple without magical "use" statements cluttering your codebase.

## Your frontend options

AdonisJS supports three primary approaches to building your frontend, each suited to different use cases and team preferences.

### Server-rendered templates

Server-rendered templates generate complete HTML pages on your backend and send them to the browser. AdonisJS provides Edge, a powerful template engine that lets you build dynamic HTML with minimal or zero JavaScript on the client-side.

This approach keeps your application simple and performant, with the server handling all the rendering logic. You can add interactivity incrementally using lightweight JavaScript libraries when needed, but the default is to render everything server-side.

Choose this approach when you want to embrace simplicity and your application has minimal interactivity that doesn't require a full-blown frontend library like React or Vue. This keeps your stack lean and reduces the number of moving parts in your application.

### SPA with API backend

You can build a JSON API backend with AdonisJS while your frontend lives in a completely separate codebase. This creates a clear separation where AdonisJS handles all backend logic and exposes data through API endpoints, while your frontend application (built with React, Vue, Angular, or any framework) consumes these endpoints.

Choose this approach when you're creating an API for multiple client applications like a mobile app and a web app. Many organizations also prefer this because it allows separate teams to work in their respective codebases with clear boundaries. You'll need to make this architectural decision based on your team structure and application requirements.

### Inertia.js

Inertia.js provides a middle ground between server-rendered templates and SPAs. You use React or Vue components as your views while keeping server-side routing and controllers. This gives you the component-based development experience of modern frontend frameworks without the complexity of building and maintaining a separate SPA.

With Inertia, you keep server-side routing, eliminate dual routing systems, reduce the need for extensive state management on the frontend, and simplify form submissions. Your application remains a monolithic deployment while providing a smooth, SPA-like user experience.

Choose this approach when you want to use React or Vue but prefer a tighter fullstack development experience with fewer moving parts on the frontend. Inertia eliminates the need for dual routing systems, extensive state management on the frontend, and simplifies form submissions while still giving you the power of modern frontend frameworks.

## Next steps

Now that you understand AdonisJS's approach to frontend, you can explore the specific implementation guides:

- [Edge templates](#) - Learn how to build server-rendered applications
- [Inertia.js](#) - Set up Inertia with React or Vue
- [Vite integration](#) - Configure Vite for asset bundling
- [Transformers](#) - Transform data for API responses