import type { OperatorButtonProps } from './types'

export function SquareOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'x²' ? 'active' : ''}`}
      onClick={() => onSelect('x²')}
    >
      x²
    </button>
  )
}
