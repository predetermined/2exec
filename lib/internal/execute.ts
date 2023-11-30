import { mergeReadableStreams } from "https://deno.land/std@0.190.0/streams/merge_readable_streams.ts";
import { ExecOptions } from "../index.ts";
import {
  ExecIntruction,
  Instruction,
  InstructionType,
} from "./instructionts.ts";

export enum ExecResultStatus {
  Failed = "Failed",
  Succeeded = "Succeeded",
}

export type ExecResult =
  | {
      status: ExecResultStatus.Succeeded;
      output: string;
    }
  | {
      status: ExecResultStatus.Failed;
      output: Error;
    };

const textDecoder = new TextDecoder();

async function execInstructionCommand(
  instruction: ExecIntruction,
  debug = false
): Promise<ExecResult> {
  if (debug) {
    console.debug("Executing instruction", instruction);
  }

  const splitCommand = instruction.command.split(" ");
  const program = splitCommand[0];
  const args = splitCommand
    .slice(1)
    .map((parameter: string) => parameter.replace(/(^['"]|['"]$)/g, ""));

  if (debug) {
    console.debug(
      `Spawning program "${program}" with args ${JSON.stringify(args)}`
    );
  }

  const command = new Deno.Command(program, {
    args,
    stdout: instruction.runInBackground ? "null" : "piped",
    stderr: instruction.runInBackground ? "null" : "piped",
  });

  try {
    const process = command.spawn();

    const joined = mergeReadableStreams(process.stdout, process.stderr);

    if (instruction.runInBackground) {
      throw new Error("Background instructions are currently unsupported");
    }

    const status = await process.status;
    const output = textDecoder.decode((await joined.getReader().read()).value);

    if (status.success) {
      return {
        status: ExecResultStatus.Succeeded,
        output,
      };
    }

    return {
      status: ExecResultStatus.Failed,
      output: new Error(output),
    };
  } catch (e) {
    if (!(e instanceof Error)) throw new Error("(should never happen)");

    return {
      status: ExecResultStatus.Failed,
      output: e,
    };
  }
}

function shouldExecInstruction(
  instruction: Instruction,
  lastExecutionResultType?: ExecResultStatus
): boolean {
  if (!instruction.expectedPrevSiblingExecutionResultType) {
    return true;
  }

  return (
    instruction.expectedPrevSiblingExecutionResultType ===
    lastExecutionResultType
  );
}

/**
 * @returns Either the execution result,
 * or `null` when the condition to execute this instruction
 * weren't satisfied.
 */
async function _execute(
  instruction: Instruction,
  options: ExecOptions & {
    prevExecResult?: ExecResult;
  }
): Promise<ExecResult | null> {
  console.log({
    options,
    instruction,
  });

  if (
    options.prevExecResult &&
    !shouldExecInstruction(instruction, options.prevExecResult.status)
  ) {
    return null;
  }

  if (instruction.type === InstructionType.Parent) {
    let prev: ExecResult = { status: ExecResultStatus.Succeeded, output: "" };
    for (const child of instruction.children) {
      if (instruction.runInBackground) {
        child.runInBackground = true;
      }

      const result = await _execute(child, {
        ...options,
        prevExecResult: prev,
      });

      if (!result) continue;

      if (result.status === ExecResultStatus.Failed) {
        prev = {
          status: ExecResultStatus.Failed,
          output: result.output,
        };
        continue;
      }

      if (prev.status === ExecResultStatus.Failed) {
        prev = {
          status: result.status,
          output: result.output,
        };
        continue;
      }

      prev = {
        status: result.status,
        output: prev.output + result.output,
      };
    }
    return prev;
  }

  return execInstructionCommand(instruction as ExecIntruction, options.debug);
}

export async function execute(
  instruction: Instruction,
  options: ExecOptions
): Promise<ExecResult> {
  const result = await _execute(instruction, options);

  if (!result) {
    // Should never happen, but let's handle it gracefully
    return { status: ExecResultStatus.Succeeded, output: "" };
  }

  return result;
}
