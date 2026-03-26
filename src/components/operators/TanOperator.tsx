import type { OperatorButtonProps } from './types'

export function TanOperatorButton({ onSelect, activeOperator }: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'tan' ? 'active' : ''}`}
      onClick={() => onSelect('tan')}
    >
      tan
    </button>
  )
}
