import type { OperatorButtonProps } from './types'

export function CosOperatorButton({ onSelect, activeOperator }: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'cos' ? 'active' : ''}`}
      onClick={() => onSelect('cos')}
    >
      cos
    </button>
  )
}
