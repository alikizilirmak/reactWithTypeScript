import type { OperatorButtonProps } from './types'

export function LogOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'log' ? 'active' : ''}`}
      onClick={() => onSelect('log')}
    >
      log
    </button>
  )
}
