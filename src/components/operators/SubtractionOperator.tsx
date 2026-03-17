import type { OperationCalculator } from './types'

// Select için çıkarma operatörü seçeneği.
export function SubtractionOperatorOption() {
  return <option value="-">-</option>
}

// Çıkarma işlemini hesaplar.
export const calculateSubtraction: OperationCalculator = (first, second) => ({
  resultText: (first - second).toString(),
  isError: false,
})
