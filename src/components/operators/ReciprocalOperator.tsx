import type { OperationCalculator, OperatorButtonProps } from './types'

// "1/x" operatör butonu (tek sayı ile çalışır).
export function ReciprocalOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '1/x' ? 'active' : ''}`}
      onClick={() => onSelect('1/x')}
    >
      1/x
    </button>
  )
}

// first değerinin tersini hesaplar.
export const calculateReciprocal: OperationCalculator = (first) => {
  if (first === 0) {
    return {
      resultText: '0 sayısının tersi tanımsızdır.',
      isError: true,
    }
  }

  return {
    resultText: (1 / first).toString(),
    isError: false,
  }
}
