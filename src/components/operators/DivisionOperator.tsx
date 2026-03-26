import type { OperatorButtonProps } from './types'

export function DivisionOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '/' ? 'active' : ''}`}
      onClick={() => onSelect('/')}
    >
      /
    </button>
  )
}
