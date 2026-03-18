import type { OperationCalculator, OperatorButtonProps } from './types'

// "|x|" operatör butonu (tek sayı ile çalışır).
export function AbsoluteOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '|x|' ? 'active' : ''}`}
      onClick={() => onSelect('|x|')}
    >
      |x|
    </button>
  )
}

// first değerinin mutlak değerini döndürür.
export const calculateAbsolute: OperationCalculator = (first) => ({
  resultText: Math.abs(first).toString(),
  isError: false,
})
