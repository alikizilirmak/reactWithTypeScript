import type { OperationCalculator, OperatorButtonProps } from './types'

// "%" operatör butonu.
export function PercentOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '%' ? 'active' : ''}`}
      onClick={() => onSelect('%')}
    >
      %
    </button>
  )
}

// first sayısının second yüzdesini hesaplar.
export const calculatePercent: OperationCalculator = (first, second) => ({
  resultText: ((first * second) / 100).toString(),
  isError: false,
})
