import type { OperationCalculator } from './types'

// Select için yüzde operatörü seçeneği.
export function PercentOperatorOption() {
  return <option value="%">%</option>
}

// first sayısının second yüzdesini hesaplar.
export const calculatePercent: OperationCalculator = (first, second) => ({
  resultText: ((first * second) / 100).toString(),
  isError: false,
})
