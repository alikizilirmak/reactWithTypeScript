import { AbsoluteOperatorButton } from './AbsoluteOperator'
import { AdditionOperatorButton } from './AdditionOperator'
import { DivisionOperatorButton } from './DivisionOperator'
import { ExpOperatorButton } from './ExpOperator'
import { FactorialOperatorButton } from './FactorialOperator'
import { LnOperatorButton } from './LnOperator'
import { LogOperatorButton } from './LogOperator'
import { ModOperatorButton } from './ModOperator'
import { MultiplicationOperatorButton } from './MultiplicationOperator'
import { PercentOperatorButton } from './PercentOperator'
import { PermilleOperatorButton } from './PermilleOperator'
import { PowerOperatorButton } from './PowerOperator'
import { ReciprocalOperatorButton } from './ReciprocalOperator'
import { RootOperatorButton } from './RootOperator'
import { SquareOperatorButton } from './SquareOperator'
import { SubtractionOperatorButton } from './SubtractionOperator'
import type { OperatorButtonProps } from './types'

export function OperatorButtons({
  onSelect,
  activeOperator,
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
      <PowerOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <RootOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <LogOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <LnOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <ExpOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <SquareOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <ReciprocalOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <AbsoluteOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <FactorialOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <ModOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <PercentOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <PermilleOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
    </>
  )
}
