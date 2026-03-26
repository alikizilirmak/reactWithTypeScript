import type { OperatorButtonProps } from './types'

export function SubtractionOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '-' ? 'active' : ''}`}
      onClick={() => onSelect('-')}
    >
      -
    </button>
  )
}
