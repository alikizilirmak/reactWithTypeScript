import type { OperationCalculator, OperatorButtonProps } from './types'

// "mod" operatör butonu (iki sayı ile çalışır).
export function ModOperatorButton({ onSelect, activeOperator }: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'mod' ? 'active' : ''}`}
      onClick={() => onSelect('mod')}
    >
      mod
    </button>
  )
}

// first mod second hesabı.
export const calculateMod: OperationCalculator = (first, second) => {
  if (second === 0) {
    return {
      resultText: 'mod işleminde bölen 0 olamaz.',
      isError: true,
    }
  }

  return {
    resultText: (first % second).toString(),
    isError: false,
  }
}
