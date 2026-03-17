import type { OperationCalculator } from './types'

export function SubtractionOperatorOption() {
  return <option value="-">-</option>
}

export const calculateSubtraction: OperationCalculator = (first, second) => ({
  resultText: (first - second).toString(),
  isError: false,
})
