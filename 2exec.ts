export interface Options {
    ignoreErrors?: boolean;
    log?: boolean;
}

enum Type {
    NO_DEPENDENCY,
    PREVIOUS_COMMAND_MUST_SUCCEED,
    PREVIOUS_COMMAND_MUST_FAIL
}

export async function exec(command: string, options: Options = { ignoreErrors: false, log: false }): Promise<string> {
    options.ignoreErrors ||= false;
    options.log ||= false;

    const commands: { command: string; type: Type; muted: boolean; }[] = [];
    let currentAppendingCommandIndex: number = 0;
    let stringStartIndexOfCurrentCommand: number = 0;
    let currentCommandType: Type = Type.NO_DEPENDENCY;

    for (let i = 0; i < command.length; i++) {
        if (i === command.length - 1) {
            commands[currentAppendingCommandIndex] = {
                command: command.slice(stringStartIndexOfCurrentCommand).trim(),
                type: currentCommandType,
                muted: false
            }
        }

        if (command[i] === "&") {
            if (command[i + 1] && command[i + 1] === "&") {
                commands[currentAppendingCommandIndex] = {
                    command: command.slice(stringStartIndexOfCurrentCommand, i - 1).trim(),
                    type: currentCommandType,
                    muted: false
                }
                currentCommandType = Type.PREVIOUS_COMMAND_MUST_SUCCEED;
            }else {
                commands[currentAppendingCommandIndex] = {
                    command: command.slice(stringStartIndexOfCurrentCommand, i - 1).trim(),
                    type: currentCommandType,
                    muted: true
                }
            }
            i += 2;
            stringStartIndexOfCurrentCommand = i;
            currentAppendingCommandIndex++;
        }

        if (command[i] === "|") {
            if (command[i + 1] && command[i + 1] === "|") {
                commands[currentAppendingCommandIndex] = {
                    command: command.slice(stringStartIndexOfCurrentCommand, i - 1).trim(),
                    type: currentCommandType,
                    muted: false
                }
                currentCommandType = Type.PREVIOUS_COMMAND_MUST_FAIL;
                i += 2;
                stringStartIndexOfCurrentCommand = i;
                currentAppendingCommandIndex++;
            }
        }
    }
    const textDecoder: TextDecoder = new TextDecoder();
    let output: string = "";
    let lastRunFailed: boolean = false;

    for (const individualCommand of commands) {
        if (individualCommand.type === Type.PREVIOUS_COMMAND_MUST_SUCCEED && lastRunFailed) {
            if (options.log) console.log(`Skipped command ' ${individualCommand.command}' because last process did fail`);
            lastRunFailed = true;
            continue;
        }

        if (individualCommand.type === Type.PREVIOUS_COMMAND_MUST_FAIL && !lastRunFailed) {
            if (options.log) console.log(`Skipped command '${individualCommand.command}' because last process didn't fail`);
            lastRunFailed = true;
            continue;
        }

        if (options.log) console.log(`Executing command '${individualCommand.command}'`);
        const commandParameters: string[] = individualCommand.command.split(" ").filter((parameter: string) => parameter);
        const process: Deno.Process = Deno.run({ cmd: commandParameters, stdout: "piped", stderr: "piped" });

        if (!individualCommand.muted && !(await process.status()).success) {
            if (options.log) console.log(`Process of command '${individualCommand.command}' threw an error`);
            if (!options.ignoreErrors) {
                process.close();
                throw new Error(textDecoder.decode(await process.stderrOutput()));
            }else {
                lastRunFailed = true;
            }
        }else {
            lastRunFailed = false;
        }

        const executionOutput: Uint8Array = await process.output();
        output += textDecoder.decode(executionOutput);
    }

    return output.replace(/\n$/, "");
}