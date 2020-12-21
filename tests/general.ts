import { exec } from "../2exec.ts";

Deno.test("Simple echo working?", async () => {
    const output = await exec("echo 'Hello, World'");
    if (output !== "Hello, World") throw new Error("Echo test failed");
});

Deno.test("Ignore errors option working?", async () => {
    const output = await exec("rm does-not-exist.txt", { ignoreErrors: true });
    if (output !== "") throw new Error("Ignore errors option test failed");
});

Deno.test("&& operator working?", async () => {
    const output = await exec("ls && echo 'Hello, World'");
    if (!output.includes("Hello, World")) throw new Error("&& operator test failed");
});

Deno.test("& operator working?", async () => {
    const output = await exec("echo 'Hello, World' &");
    if (output !== "") throw new Error("& operator test failed");
});

Deno.test("|| operator working?", async () => {
    const output = await exec("rm does-not-exist.txt || echo 'Hello, World'", { ignoreErrors: true });
    if (output !== "Hello, World") throw new Error("|| operator test failed");
});