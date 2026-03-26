import type { OperatorButtonProps } from './types'

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
