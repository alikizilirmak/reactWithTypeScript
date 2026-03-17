import type { OperationCalculator, OperatorButtonProps } from './types'

// "^" operatör butonu.
export function PowerOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '^' ? 'active' : ''}`}
      onClick={() => onSelect('^')}
    >
      x^n
    </button>
  )
}

// first^second hesabı.
export const calculatePower: OperationCalculator = (first, second) => ({
  resultText: (first ** second).toString(),
  isError: false,
})
