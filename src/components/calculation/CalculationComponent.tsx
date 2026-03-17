import { useEffect } from 'react'
import { operatorCalculators, type Operator } from '../operators'

// Props: Parent component'ten bu component'e geçen verilerdir.
// CalculationComponent ekrana bir şey çizmez, sadece verilen job'ı hesaplar.
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
  // useEffect: React'te bir "yan etki" (side-effect) çalıştırmak için kullanılır.
  // Burada operator/first/second değişince hesaplamayı tetikleyip sonucu parent'a iletiyoruz.
  useEffect(() => {
    const { resultText, isError } = operatorCalculators[operator](first, second)
    onResult(jobId, resultText, isError)
  }, [jobId, first, second, operator, onResult])

  // UI yok: Bu component'in görevi sadece hesaplayıp callback çağırmak.
  return null
}
