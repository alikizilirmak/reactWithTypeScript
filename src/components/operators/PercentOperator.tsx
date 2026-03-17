import type { OperationCalculator } from './types'

export function PercentOperatorOption() {
  return <option value="%">%</option>
}

export const calculatePercent: OperationCalculator = (first, second) => ({
  resultText: ((first * second) / 100).toString(),
  isError: false,
})
