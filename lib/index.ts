import { execute } from "./internal/execute.ts";
import { parse } from "./internal/parse.ts";

export interface ExecOptions {
  /** @default false */
  debug?: boolean;
}

export async function exec(input: string, options: ExecOptions = {}) {
  const instruction = parse(input, options);

  return await execute(instruction, options);
}
