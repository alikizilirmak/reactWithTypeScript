import type { OperatorButtonProps } from './types'

export function LnOperatorButton({ onSelect, activeOperator }: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'ln' ? 'active' : ''}`}
      onClick={() => onSelect('ln')}
    >
      ln
    </button>
  )
}
