import type { OperatorButtonProps } from './types'

export function RootOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '√' ? 'active' : ''}`}
      onClick={() => onSelect('√')}
    >
      n√x
    </button>
  )
}
