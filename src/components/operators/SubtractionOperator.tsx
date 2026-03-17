import type { OperationCalculator, OperatorButtonProps } from './types'

// "-" operatör butonu.
export function SubtractionOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '-' ? 'active' : ''}`}
      onClick={() => onSelect('-')}
    >
      -
    </button>
  )
}

// Çıkarma işlemini hesaplar.
export const calculateSubtraction: OperationCalculator = (first, second) => ({
  resultText: (first - second).toString(),
  isError: false,
})
