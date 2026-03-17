import type { OperationCalculator } from './types'

export function AdditionOperatorOption() {
  return <option value="+">+</option>
}

export const calculateAddition: OperationCalculator = (first, second) => ({
  resultText: (first + second).toString(),
  isError: false,
})
