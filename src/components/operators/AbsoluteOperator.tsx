import type { OperatorButtonProps } from './types'

export function AbsoluteOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '|x|' ? 'active' : ''}`}
      onClick={() => onSelect('|x|')}
    >
      |x|
    </button>
  )
}
