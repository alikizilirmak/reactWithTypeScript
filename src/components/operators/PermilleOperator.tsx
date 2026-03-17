import type { OperationCalculator } from './types'

// Select için binde operatörü seçeneği.
export function PermilleOperatorOption() {
  return <option value="‰">‰</option>
}

// first sayısının second bindesini hesaplar.
export const calculatePermille: OperationCalculator = (first, second) => ({
  resultText: ((first * second) / 1000).toString(),
  isError: false,
})
