import type { OperationCalculator, OperatorButtonProps } from './types'

// "x!" operatör butonu (tek sayı ile çalışır).
export function FactorialOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'x!' ? 'active' : ''}`}
      onClick={() => onSelect('x!')}
    >
      x!
    </button>
  )
}

// first değerinin faktöriyelini hesaplar.
export const calculateFactorial: OperationCalculator = (first) => {
  if (!Number.isInteger(first) || first < 0) {
    return {
      resultText: 'Faktöriyel sadece 0 veya pozitif tam sayılar için tanımlıdır.',
      isError: true,
    }
  }

  // JavaScript Number tipinde 171! taşar (Infinity olur), bu yüzden üst sınır koyuyoruz.
  if (first > 170) {
    return {
      resultText: 'Bu sayı için faktöriyel çok büyük (maksimum 170!).',
      isError: true,
    }
  }

  let result = 1
  for (let index = 2; index <= first; index += 1) {
    result *= index
  }

  return {
    resultText: result.toString(),
    isError: false,
  }
}
