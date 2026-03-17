import type { OperationCalculator, OperatorButtonProps } from './types'

// "‰" operatör butonu.
export function PermilleOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '‰' ? 'active' : ''}`}
      onClick={() => onSelect('‰')}
    >
      ‰
    </button>
  )
}

// first sayısının second bindesini hesaplar.
export const calculatePermille: OperationCalculator = (first, second) => ({
  resultText: ((first * second) / 1000).toString(),
  isError: false,
})
