import { exec } from "../2exec.ts";

Deno.test("Simple echo working?", async () => {
    const output = await exec("echo 'Hello, World'");
    if (output !== "Hello, World") throw new Error("Echo test failed");
});

Deno.test("&& operator working?", async () => {
    const output = await exec("ls && echo 'Hello, World'");
    if (!output.includes("Hello, World")) throw new Error("&& operator test failed");
});

Deno.test("& operator working?", async () => {
    const output = await exec("echo 'Hello, World' &");
    if (output !== "") throw new Error("&& operator test failed");
});