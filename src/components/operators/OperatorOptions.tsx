import { AdditionOperatorButton } from './AdditionOperator'
import { DivisionOperatorButton } from './DivisionOperator'
import { MultiplicationOperatorButton } from './MultiplicationOperator'
import { PercentOperatorButton } from './PercentOperator'
import { PermilleOperatorButton } from './PermilleOperator'
import { PowerOperatorButton } from './PowerOperator'
import { RootOperatorButton } from './RootOperator'
import { SubtractionOperatorButton } from './SubtractionOperator'
import type { OperatorButtonProps } from './types'

export function OperatorButtons({
  onSelect,
  activeOperator,
  showScientific = true,
}: OperatorButtonProps) {
  return (
    <>
      {/* Butonların her biri kendi operatör component'inden geliyor. */}
      <AdditionOperatorButton
        onSelect={onSelect}
        activeOperator={activeOperator}
      />
      <SubtractionOperatorButton
        onSelect={onSelect}
        activeOperator={activeOperator}
      />
      <MultiplicationOperatorButton
        onSelect={onSelect}
        activeOperator={activeOperator}
      />
      <DivisionOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      {showScientific && (
        <>
          <PowerOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
          <RootOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
          <PercentOperatorButton
            onSelect={onSelect}
            activeOperator={activeOperator}
          />
          <PermilleOperatorButton
            onSelect={onSelect}
            activeOperator={activeOperator}
          />
        </>
      )}
    </>
  )
}
