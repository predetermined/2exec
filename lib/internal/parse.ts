import { ExecOptions } from "../index.ts";
import { ExecResultStatus } from "./execute.ts";
import { Instruction, InstructionType } from "./instructionts.ts";

interface ParseOptions extends Pick<ExecOptions, "debug"> {
  shouldAllowBackgroundProcesses?: boolean;
}

function _parse(input: string, options: ParseOptions) {
  let index = 0;

  function c(offset = 0) {
    return input[index + offset];
  }

  function consumeWhitespace() {
    while (c() === " ") {
      ++index;
    }
  }

  function consumeUntil(char: string) {
    let r = "";
    while (c() !== char) {
      r += c();
      ++index;
    }
    return r;
  }

  function consume() {
    return input[index++];
  }

  const instructions: Instruction[] = [];
  let currentCommand = "";

  function check(): Instruction[] {
    if (index >= input.length) {
      if (currentCommand) {
        instructions.push({
          type: InstructionType.Exec,
          command: currentCommand.trim(),
        });
      }

      return instructions;
    }

    switch (c()) {
      case "(": {
        consume();
        instructions.push({
          type: InstructionType.Parent,
          children: _parse(consumeUntil(")"), options),
        });
        consume();
        break;
      }

      case "&": {
        // && (AND)
        if (c(1) === "&") {
          consume();
          consume();
          instructions.push(..._parse(currentCommand, options));
          currentCommand = "";

          instructions.push({
            type: InstructionType.Parent,
            children: _parse(input.slice(index), options),
            expectedPrevSiblingExecutionResultType: ExecResultStatus.Succeeded,
          });
          index = input.length;
          break;
        }

        // & (background)
        if (!options.shouldAllowBackgroundProcesses) {
          throw new Error(
            "Tried to parse a background process, which is not allowed."
          );
        }

        consume();
        instructions.push({
          type: InstructionType.Parent,
          children: _parse(currentCommand, options),
          runInBackground: true,
        });
        currentCommand = "";
        break;
      }

      case "|": {
        // || (OR)
        if (c(1) === "|") {
          consume();
          consume();
          instructions.push(..._parse(currentCommand, options));
          currentCommand = "";

          instructions.push({
            type: InstructionType.Parent,
            children: _parse(input.slice(index), options),
            expectedPrevSiblingExecutionResultType: ExecResultStatus.Failed,
          });
          index = input.length;
          break;
        }
      }
      /** falls through */

      default:
        currentCommand += consume();
        break;
    }

    return check();
  }

  consumeWhitespace();
  const f = check();
  return f;
}

export function parse(input: string, options: ParseOptions = {}) {
  const tree = {
    type: InstructionType.Parent,
    children: _parse(input, options),
  } satisfies Instruction;

  if (options.debug) {
    console.debug("Parsed instruction tree:", JSON.stringify(tree, null, 2));
  }

  return tree;
}
