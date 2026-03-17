import type { OperationCalculator } from './types'

// Bu component sadece select içinde "+" seçeneğini render eder.
export function AdditionOperatorOption() {
  return <option value="+">+</option>
}

// Toplama işleminin hesaplama mantığı bu dosyada tutulur.
export const calculateAddition: OperationCalculator = (first, second) => ({
  resultText: (first + second).toString(),
  isError: false,
})
