import type { OperationCalculator, OperatorButtonProps } from './types'

// "*" operatör butonu.
export function MultiplicationOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '*' ? 'active' : ''}`}
      onClick={() => onSelect('*')}
    >
      *
    </button>
  )
}

// Çarpma işlemini hesaplar.
export const calculateMultiplication: OperationCalculator = (first, second) => ({
  resultText: (first * second).toString(),
  isError: false,
})
