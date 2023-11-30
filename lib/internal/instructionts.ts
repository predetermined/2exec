import { ExecResultStatus } from "./execute.ts";

export enum InstructionType {
  Parent = "Parent",
  Exec = "Execution",
}

export interface BaselineInstruction {
  expectedPrevSiblingExecutionResultType?: ExecResultStatus;
  runInBackground?: boolean;
}

export interface ExecIntruction extends BaselineInstruction {
  type: InstructionType.Exec;
  command: string;
}

export interface ParentInstruction extends BaselineInstruction {
  type: InstructionType.Parent;
  children: Instruction[];
}

export type Instruction = ExecIntruction | ParentInstruction;
