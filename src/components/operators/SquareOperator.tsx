import type { OperationCalculator, OperatorButtonProps } from './types'

// "x²" operatör butonu (tek sayı ile çalışır).
export function SquareOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'x²' ? 'active' : ''}`}
      onClick={() => onSelect('x²')}
    >
      x²
    </button>
  )
}

// first değerinin karesini hesaplar.
export const calculateSquare: OperationCalculator = (first) => ({
  resultText: (first ** 2).toString(),
  isError: false,
})
