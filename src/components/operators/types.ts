export type Operator = '+' | '-' | '*' | '/' | '^' | '√' | '%' | '‰'

export type OperationResult = {
  resultText: string
  isError: boolean
}

export type OperationCalculator = (
  first: number,
  second: number,
) => OperationResult
