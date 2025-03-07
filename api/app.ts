// api/app.ts
import { Application } from "https://deno.land/x/oak/mod.ts";
import { corsMiddleware, handleOptions, errorHandler } from "./middleware.ts";
import router from "./routes.ts";

const app = new Application();

app.use(corsMiddleware);
app.use(handleOptions);
app.use(errorHandler);

app.use(router.routes());
app.use(router.allowedMethods());

const port = 8000;
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });