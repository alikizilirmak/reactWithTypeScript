import type { OperationCalculator } from './types'

export function PowerOperatorOption() {
  return <option value="^">x^n</option>
}

export const calculatePower: OperationCalculator = (first, second) => ({
  resultText: (first ** second).toString(),
  isError: false,
})
