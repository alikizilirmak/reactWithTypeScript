import type { OperationCalculator } from './types'

// Select için üs alma seçeneği.
export function PowerOperatorOption() {
  return <option value="^">x^n</option>
}

// first^second hesabı.
export const calculatePower: OperationCalculator = (first, second) => ({
  resultText: (first ** second).toString(),
  isError: false,
})
