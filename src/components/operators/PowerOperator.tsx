import type { OperatorButtonProps } from './types'

export function PowerOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '^' ? 'active' : ''}`}
      onClick={() => onSelect('^')}
    >
      x^n
    </button>
  )
}
