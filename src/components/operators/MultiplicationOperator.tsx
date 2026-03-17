import type { OperationCalculator } from './types'

// Select için çarpma operatörü seçeneği.
export function MultiplicationOperatorOption() {
  return <option value="*">*</option>
}

// Çarpma işlemini hesaplar.
export const calculateMultiplication: OperationCalculator = (first, second) => ({
  resultText: (first * second).toString(),
  isError: false,
})
