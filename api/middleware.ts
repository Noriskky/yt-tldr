import { Context, Next } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";

export const corsMiddleware = oakCors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
    optionsSuccessStatus: 200,
});

export async function handleOptions(ctx: Context, next: Next) {
    if (ctx.request.method === "OPTIONS") {
        ctx.response.status = 204;
        ctx.response.headers.set("Access-Control-Allow-Origin", "*");
        ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
        ctx.response.headers.set("Access-Control-Max-Age", "86400");
        return;
    }
    await next();
}

export async function errorHandler(ctx: Context, next: Next) {
    try {
        await next();
    } catch (err) {
        console.error("Server error:", err);
        ctx.response.status = err instanceof Error && 'status' in err ? Number(err.status) : 500;
        ctx.response.body = {
            error: err instanceof Error ? err.message : "Internal Server Error",
            stack: Deno.env.get("ENVIRONMENT") === "development" && err instanceof Error ? err.stack : undefined
        };
        ctx.response.headers.set("Content-Type", "application/json");
    }
}