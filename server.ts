import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod"
import * as fs from "node:fs/promises"
import { realpath } from "node:fs/promises";
import path from "node:path";

serveStdio(() => {
    const server = new McpServer({name: "test", version: "1.0.0", }, { capabilities: { tools: {} }});
    
    server.registerTool('test', {
        inputSchema : z.object({
            weight: z.number(),
            height: z.number()
        }),
        outputSchema: z.object({length: z.number()})
    }, async({weight, height}) => {
        const output = { length : weight * height };
        return {
            content : [{type: "text", text: JSON.stringify(output)}],
            structuredContent: output
    };
    })
    
    
    const ROOT = process.env.ROOT_DIR ?? import.meta.dirname;

    server.registerTool('list', {
        description: "returns all files in this directory"
    }, async() => {
        const files = await fs.readdir(ROOT)
        return {content: [{type: "text", text: JSON.stringify(files)}]}
    })

    async function safePath(userPath: string){

        const BLOCKED = ['node_modules', '.git']
        const root = await realpath(ROOT)
        console.log("root", root)

        const full = await realpath( path.resolve(root, userPath) )
        console.log("full", full)
        const rel = path.relative(root, full)
        console.log("relative", rel)

        if (rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel))
            throw new Error("Path is outside the project folder");
        if (rel.split(path.sep).some(p => BLOCKED.includes(p) || p.startsWith(".env")))
            throw new Error("That file is blocked");

  return full;
    }

    server.registerTool('read_life', {
        inputSchema: z.object({
            path: z.string()
        })
    }, async({path}) => {
        const filePath = await safePath(path)

        const text = await fs.readFile(filePath, "utf-8")

        return {content: [{type: "text", text: JSON.stringify(text)}]}
    })
    
    
    return server;
})