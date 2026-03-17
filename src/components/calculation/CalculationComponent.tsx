import { useEffect } from 'react'
import { operatorCalculators, type Operator } from '../operators'

type CalculationComponentProps = {
  jobId: number
  first: number
  second: number
  operator: Operator
  onResult: (jobId: number, resultText: string, isError: boolean) => void
}

// Bu component sadece hesaplama işini yapar ve sonucu parent'a iletir.
// UI çizmez; "renderless component" yaklaşımı kullanıyoruz.
export function CalculationComponent({
  jobId,
  first,
  second,
  operator,
  onResult,
}: CalculationComponentProps) {
  useEffect(() => {
    const { resultText, isError } = operatorCalculators[operator](first, second)
    onResult(jobId, resultText, isError)
  }, [jobId, first, second, operator, onResult])

  return null
}
