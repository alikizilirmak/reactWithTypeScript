import type { OperationCalculator, OperatorButtonProps } from './types'

// "e^x" operatör butonu (tek sayı ile çalışır).
export function ExpOperatorButton({ onSelect, activeOperator }: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'e^x' ? 'active' : ''}`}
      onClick={() => onSelect('e^x')}
    >
      e^x
    </button>
  )
}

// first değeri için e^x hesaplar.
export const calculateExp: OperationCalculator = (first) => {
  const calculation = Math.exp(first)
  if (!Number.isFinite(calculation)) {
    return {
      resultText: 'e^x sonucu sayı sınırını aşıyor.',
      isError: true,
    }
  }

  return {
    resultText: calculation.toString(),
    isError: false,
  }
}
