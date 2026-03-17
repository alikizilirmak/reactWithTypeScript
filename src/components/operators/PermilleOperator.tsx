import type { OperationCalculator } from './types'

export function PermilleOperatorOption() {
  return <option value="‰">‰</option>
}

export const calculatePermille: OperationCalculator = (first, second) => ({
  resultText: ((first * second) / 1000).toString(),
  isError: false,
})
