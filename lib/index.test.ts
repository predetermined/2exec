import { assert } from "https://deno.land/std/testing/asserts.ts";
import { exec } from "./index.ts";
import { ExecResultStatus } from "./internal/execute.ts";

Deno.test(async function printsHelloWorld() {
  const result = await exec("echo 'Hello World!'", {
    debug: true,
  });

  assert(result.output === "Hello World!\n");
});

Deno.test(async function fails() {
  const result = await exec("fails", {
    debug: true,
  });

  assert(result.status === ExecResultStatus.Failed);
  assert(result.output instanceof Error);
  assert(result.output.name === "NotFound");
});

Deno.test(async function and() {
  const result = await exec("echo 'wow!' && echo 'Hello World!'", {
    debug: true,
  });

  assert(result.status === ExecResultStatus.Succeeded);
  assert(result.output === "wow!\nHello World!\n");
});

Deno.test(async function andShouldFail() {
  const result = await exec("fails && echo 'Hello World!'", {
    debug: true,
  });

  console.log(result);

  assert(result.status === ExecResultStatus.Failed);
  assert(result.output.name === "NotFound");
});

Deno.test(async function or() {
  const result = await exec("fails || echo 'Hello World!'", {
    debug: true,
  });

  assert(result.status === ExecResultStatus.Succeeded);
  assert(result.output === "Hello World!\n");
});

Deno.test(async function orNeverHitsRightSide() {
  const result = await exec("echo 'true!' || echo 'Hello World!'", {
    debug: true,
  });

  assert(result.status === ExecResultStatus.Succeeded);
  assert(result.output === "true!\n");
});

Deno.test(async function executionGroups() {
  const result = await exec("(fails && echo false) || echo true", {
    debug: true,
  });

  assert(result.status === ExecResultStatus.Succeeded);
  assert(result.output === "true!\n");
});
