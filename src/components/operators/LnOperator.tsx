import type { OperationCalculator, OperatorButtonProps } from './types'

// "ln" operatör butonu (tek sayı ile anında çalışır).
export function LnOperatorButton({ onSelect, activeOperator }: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'ln' ? 'active' : ''}`}
      onClick={() => onSelect('ln')}
    >
      ln
    </button>
  )
}

// Doğal logaritma: ln(first)
// second parametresi interface uyumu için var, kullanılmıyor.
export const calculateLn: OperationCalculator = (first) => {
  if (first <= 0) {
    return {
      resultText: 'ln için sayı 0 veya negatif olamaz.',
      isError: true,
    }
  }

  return {
    resultText: Math.log(first).toString(),
    isError: false,
  }
}
