import type { OperationCalculator } from './types'

export function MultiplicationOperatorOption() {
  return <option value="*">*</option>
}

export const calculateMultiplication: OperationCalculator = (first, second) => ({
  resultText: (first * second).toString(),
  isError: false,
})
