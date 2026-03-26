import type { OperatorButtonProps } from './types'

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
