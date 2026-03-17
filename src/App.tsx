import { useRef, useState } from 'react'
import './App.css'
import { CalculationComponent } from './components/calculation/CalculationComponent'
import {
  isBasicOperator,
  isDegreeOperator,
  isRatioOperator,
  OperatorButtons,
  type Operator,
} from './components/operators'

// TypeScript'teki "type" anahtar kelimesi ile veri şekillerini tanımlarız.
// Burada geçmiş listesindeki her satırın hangi alanlara sahip olacağını sabitliyoruz.
type HistoryItem = {
  firstValue: string
  secondValue: string
  operator: Operator
  result: string
  expression: string
  isError: boolean
}

// Hesaplama isteğini bir job olarak tutuyoruz.
// Bu sayede hesaplamayı App dışındaki bir component tetikleyebiliyor.
type CalculationJob = {
  id: number
  first: number
  second: number
  operator: Operator
  source: 'equal' | 'chain'
  nextOperator?: Operator
}

type CalculatorMode = 'basic' | 'scientific'

function App() {
  // React'teki "useState" bir Hook'tur.
  // Hook: component içinde veriyi (state) saklamamızı sağlar.
  const [displayValue, setDisplayValue] = useState<string>('0')
  const [lastPressedValue, setLastPressedValue] = useState<string>('')
  const [storedValue, setStoredValue] = useState<number | null>(null)
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null)
  const [calculationJob, setCalculationJob] = useState<CalculationJob | null>(null)
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>('scientific')
  const [isWaitingForSecondValue, setIsWaitingForSecondValue] =
    useState<boolean>(false)
  const calculationSequenceRef = useRef<number>(0)
  const handledJobIdsRef = useRef<Set<number>>(new Set())

  // Kullanıcının yaptığı son işlemleri burada tutuyoruz.
  // En güncel işlem en üstte olacak.
  const [history, setHistory] = useState<HistoryItem[]>([])

  // "null" değeri burada "henüz geçerli bir sayı yok" anlamında kullanılıyor.
  // Regex + Number kontrolü ile güvenli parse yapıyoruz.
  const parseNumberInput = (rawValue: string): number | null => {
    const trimmedValue = rawValue.trim()
    const isValidNumber = /^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmedValue)

    if (!isValidNumber) {
      return null
    }

    const parsedValue = Number(trimmedValue)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  // Geçmişte görünürken boş değerleri daha anlaşılır göstermek için yardımcı fonksiyon.
  const toDisplayValue = (rawValue: string): string => {
    const trimmedValue = rawValue.trim()
    return trimmedValue === '' ? 'boş' : trimmedValue
  }

  // Bu fonksiyon geçmişte gözüken işlem metnini üretir.
  // Farklı operatörlerde daha anlaşılır ifade formatı seçiyoruz.
  const buildExpression = (
    first: string,
    selectedOperator: Operator,
    second: string,
    resultText: string,
  ): string => {
    if (selectedOperator === '√') {
      return `${second}. dereceden kök(${first}) = ${resultText}`
    }

    if (selectedOperator === '%') {
      return `${first} sayısının %${second} değeri = ${resultText}`
    }

    if (selectedOperator === '‰') {
      return `${first} sayısının ‰${second} değeri = ${resultText}`
    }

    return `${first} ${selectedOperator} ${second} = ${resultText}`
  }

  // Geçmişe kayıt ekleme işi tek yerde dursun diye helper kullandık.
  // Bu yaklaşım kod tekrarını azaltır.
  const addToHistoryByValues = (
    first: string,
    second: string,
    selectedOperator: Operator,
    resultText: string,
    isError = false,
  ) => {
    const displayFirst = toDisplayValue(first)
    const displaySecond = toDisplayValue(second)

    const historyItem: HistoryItem = {
      firstValue: first,
      secondValue: second,
      operator: selectedOperator,
      result: resultText,
      isError,
      expression: buildExpression(
        displayFirst,
        selectedOperator,
        displaySecond,
        resultText,
      ),
    }

    setHistory((previousHistory) => [historyItem, ...previousHistory].slice(0, 10))
  }

  // Sayısal senaryolarda helper: number değerleri string'e çevirip history'e ekler.
  const addToHistory = (
    first: number,
    second: number,
    selectedOperator: Operator,
    resultText: string,
    isError = false,
  ) => {
    addToHistoryByValues(
      first.toString(),
      second.toString(),
      selectedOperator,
      resultText,
      isError,
    )
  }

  // Hesaplama job'ı oluştururken benzersiz id veriyoruz.
  // useRef ile tuttuğumuz sayaç, render'lar arasında değerini korur.
  const queueCalculationJob = (job: Omit<CalculationJob, 'id'>) => {
    calculationSequenceRef.current += 1
    const nextId = calculationSequenceRef.current

    // Çok uzun kullanımda set'in sınırsız büyümemesi için ara sıra temizliyoruz.
    if (handledJobIdsRef.current.size > 200) {
      handledJobIdsRef.current.clear()
    }

    handledJobIdsRef.current.delete(nextId)
    setCalculationJob({
      id: nextId,
      ...job,
    })
  }

  // Hesaplama component'i sonucu döndüğünde bu fonksiyon çalışır.
  const handleCalculationResult = (
    finishedJob: CalculationJob,
    resultText: string,
    isError: boolean,
  ) => {
    // ResultText'i her durumda ekrana basıyoruz (hata mesajı da olabilir).
    setDisplayValue(resultText)
    addToHistory(
      finishedJob.first,
      finishedJob.second,
      finishedJob.operator,
      resultText,
      isError,
    )

    if (finishedJob.source === 'chain') {
      // "chain" = kullanıcı bir operatöre basarak yeni işlemi zincirli başlatıyor.
      // Örn: 5 + 2 + ... gibi.
      if (isError) {
        setStoredValue(null)
        setPendingOperator(null)
        setIsWaitingForSecondValue(true)
        setCalculationJob(null)
        return
      }

      const parsedResult = parseNumberInput(resultText)

      if (parsedResult === null) {
        setStoredValue(null)
        setPendingOperator(null)
        setIsWaitingForSecondValue(true)
        setCalculationJob(null)
        return
      }

      setStoredValue(parsedResult)
      setPendingOperator(finishedJob.nextOperator ?? null)
      setIsWaitingForSecondValue(true)
      setCalculationJob(null)
      return
    }

    // "equal" akışında iş tamamlandığı için bekleyen operatörü sıfırlıyoruz.
    setStoredValue(null)
    setPendingOperator(null)
    setIsWaitingForSecondValue(true)
    setCalculationJob(null)
  }

  // Rakam butonları için giriş fonksiyonu.
  // Eğer yeni ikinci sayı bekleniyorsa ekrandaki değeri sıfırdan başlatır.
  const appendDigit = (digit: string) => {
    if (isWaitingForSecondValue || parseNumberInput(displayValue) === null) {
      setDisplayValue(digit)
      setLastPressedValue(digit)
      setIsWaitingForSecondValue(false)
      return
    }

    if (displayValue === '0') {
      setDisplayValue(digit)
      setLastPressedValue(digit)
      return
    }

    const nextValue = `${displayValue}${digit}`
    setDisplayValue(nextValue)
    setLastPressedValue(nextValue)
  }

  // Ondalık nokta ekleme işlemi.
  const appendDecimal = () => {
    if (isWaitingForSecondValue || parseNumberInput(displayValue) === null) {
      setDisplayValue('0.')
      setLastPressedValue('0.')
      setIsWaitingForSecondValue(false)
      return
    }

    if (!displayValue.includes('.')) {
      const nextValue = `${displayValue}.`
      setDisplayValue(nextValue)
      setLastPressedValue(nextValue)
    }
  }

  // Pozitif/negatif işaretini çevirir (±).
  const toggleSign = () => {
    const parsedValue = parseNumberInput(displayValue)

    if (parsedValue === null || parsedValue === 0) {
      return
    }

    if (displayValue.startsWith('-')) {
      const nextValue = displayValue.slice(1)
      setDisplayValue(nextValue)
      setLastPressedValue(nextValue)
      return
    }

    const nextValue = `-${displayValue}`
    setDisplayValue(nextValue)
    setLastPressedValue(nextValue)
  }

  // Operatör butonuna basıldığında çalışır.
  // İlk sayı saklanır, ikinci sayı için bekleme moduna geçilir.
  const handleOperatorSelect = (selectedOperator: Operator) => {
    // Basit modda güvenlik kontrolü: 4 işlem dışındaki operatörleri işleme alma.
    if (calculatorMode === 'basic' && !isBasicOperator(selectedOperator)) {
      return
    }

    setLastPressedValue(selectedOperator)
    const currentValue = parseNumberInput(displayValue)

    if (currentValue === null) {
      setDisplayValue('Lütfen önce geçerli bir sayı girin.')
      return
    }

    if (storedValue === null) {
      setStoredValue(currentValue)
      setPendingOperator(selectedOperator)
      setIsWaitingForSecondValue(true)
      return
    }

    if (pendingOperator !== null && !isWaitingForSecondValue) {
      // Burada hesaplamayı direkt yapmıyoruz.
      // Hesaplama işini CalculationComponent'e devretmek için job oluşturuyoruz.
      queueCalculationJob({
        first: storedValue,
        second: currentValue,
        operator: pendingOperator,
        source: 'chain',
        nextOperator: selectedOperator,
      })
      return
    }

    setPendingOperator(selectedOperator)
    setIsWaitingForSecondValue(true)
  }

  // "=" butonu: bekleyen işlemi çalıştırır.
  const handleEqual = () => {
    setLastPressedValue('=')
    if (pendingOperator === null || storedValue === null) {
      return
    }

    const secondValue = parseNumberInput(displayValue)

    if (secondValue === null) {
      const errorResult = 'Lütfen geçerli sayılar girin.'
      setDisplayValue(errorResult)
      addToHistoryByValues(
        storedValue.toString(),
        displayValue,
        pendingOperator,
        errorResult,
        true,
      )
      setStoredValue(null)
      setPendingOperator(null)
      setIsWaitingForSecondValue(true)
      return
    }

    queueCalculationJob({
      first: storedValue,
      second: secondValue,
      operator: pendingOperator,
      source: 'equal',
    })
  }

  // Tüm hesaplama ekranını sıfırlar.
  const clearAll = () => {
    setDisplayValue('0')
    setLastPressedValue('')
    setStoredValue(null)
    setPendingOperator(null)
    setCalculationJob(null)
    setIsWaitingForSecondValue(false)
  }

  // Mod değişimi: basit / bilimsel.
  // Basit moda geçerken bilimsel bir operatör seçiliyse bekleyen işlemi temizliyoruz.
  const handleModeChange = (nextMode: CalculatorMode) => {
    setCalculatorMode(nextMode)

    if (nextMode === 'basic' && pendingOperator && !isBasicOperator(pendingOperator)) {
      setPendingOperator(null)
      setStoredValue(null)
      setCalculationJob(null)
      setIsWaitingForSecondValue(false)
    }
  }

  // Sadece geçmiş kayıtlarını temizlemek için ayrı bir fonksiyon.
  const clearHistory = () => {
    setHistory([])
  }

  // Geçmişten bir satıra tıklanınca ilgili verileri tekrar forma yüklüyoruz.
  const applyHistoryItem = (item: HistoryItem) => {
    setDisplayValue(item.result)
    setLastPressedValue(item.expression)
    setStoredValue(null)
    setPendingOperator(null)
    setCalculationJob(null)
    setIsWaitingForSecondValue(true)
  }

  // UI'da kullanıcıya hangi ikinci değerin beklendiğini anlatan kısa metin.
  const operatorHint =
    calculatorMode === 'basic'
      ? 'Basit mod: sadece +, -, * ve / kullanılabilir.'
      : isDegreeOperator(pendingOperator ?? '+')
        ? 'Seçili işlem derece bekliyor.'
        : isRatioOperator(pendingOperator ?? '+')
          ? 'Seçili işlem oran bekliyor.'
          : 'Rakam girip bir operatör seçebilirsin.'

  return (
    // Layout'u iki kolona ayırıyoruz: solda hesap makinesi, sağda işlem geçmişi.
    <div className="app-layout">
      {calculationJob && (
        // calculationJob varsa renderless hesaplama component'i çalışır.
        // Sonucu onResult callback'i ile tekrar App state'ine taşır.
        <CalculationComponent
          jobId={calculationJob.id}
          first={calculationJob.first}
          second={calculationJob.second}
          operator={calculationJob.operator}
          onResult={(jobId, resultText, isError) => {
            if (calculationJob.id !== jobId) {
              return
            }

            // React StrictMode'da effect iki kez çalışabildiği için
            // aynı job id'den gelen ikinci sonucu yoksayıyoruz.
            if (handledJobIdsRef.current.has(jobId)) {
              return
            }

            handledJobIdsRef.current.add(jobId)

            handleCalculationResult(calculationJob, resultText, isError)
          }}
        />
      )}

      {/* Uygulamanın hesaplama tarafı */}
      <main className="calculator">
        <h1>Mini Hesap Makinesi</h1>
        <p className="subtitle">Toplama, çıkarma, çarpma, bölme, üs, kök, yüzde ve binde</p>

        {/* 5 satırlık ekran alanı: alt satırda sonuç, sol üstte son basılan değer. */}
        <div className="display-section">
          <span className="display-label">Ekran (5 satır)</span>
          <div className="display-board" role="status" aria-live="polite">
            <span className="last-pressed">{lastPressedValue || '\u00A0'}</span>
            <span className="display-value">{displayValue}</span>
          </div>
          <p className="input-hint">{operatorHint}</p>
        </div>

        {/* Ekranın altındaki mod seçimi butonları */}
        <div className="mode-switch" role="group" aria-label="Hesap makinesi modu">
          <button
            type="button"
            className={`mode-button ${calculatorMode === 'basic' ? 'active' : ''}`}
            onClick={() => handleModeChange('basic')}
          >
            Basit Hesap Makinesi
          </button>
          <button
            type="button"
            className={`mode-button ${calculatorMode === 'scientific' ? 'active' : ''}`}
            onClick={() => handleModeChange('scientific')}
          >
            Bilimsel Hesap Makinesi
          </button>
        </div>

        {/* Sol blok sayısal tuşlar, sağ blok operatör tuşları */}
        <div className="keypad-layout">
          <div className="number-pad">
            <button type="button" onClick={() => appendDigit('7')}>
              7
            </button>
            <button type="button" onClick={() => appendDigit('8')}>
              8
            </button>
            <button type="button" onClick={() => appendDigit('9')}>
              9
            </button>
            <button type="button" onClick={() => appendDigit('4')}>
              4
            </button>
            <button type="button" onClick={() => appendDigit('5')}>
              5
            </button>
            <button type="button" onClick={() => appendDigit('6')}>
              6
            </button>
            <button type="button" onClick={() => appendDigit('1')}>
              1
            </button>
            <button type="button" onClick={() => appendDigit('2')}>
              2
            </button>
            <button type="button" onClick={() => appendDigit('3')}>
              3
            </button>
            <button type="button" onClick={toggleSign}>
              ±
            </button>
            <button type="button" onClick={() => appendDigit('0')}>
              0
            </button>
            <button type="button" onClick={appendDecimal}>
              .
            </button>
          </div>

          <div className={`operator-pad ${calculatorMode}`}>
            <OperatorButtons
              onSelect={handleOperatorSelect}
              activeOperator={pendingOperator}
              showScientific={calculatorMode === 'scientific'}
            />
          </div>
        </div>

        <div className="actions">
          <button type="button" className="equal" onClick={handleEqual}>
            =
          </button>
          <button type="button" className="secondary" onClick={clearAll}>
            Temizle
          </button>
        </div>
      </main>

      {/* Sağdaki ayrı div: son 10 işlemin tarihçesi */}
      <aside className="history" aria-label="İşlem geçmişi">
        <div className="history-header">
          <h2>İşlem Geçmişi</h2>
          <button
            type="button"
            className="clear-history"
            onClick={clearHistory}
            disabled={history.length === 0}
          >
            Tümünü Temizle
          </button>
        </div>

        <div className="history-content">
          {history.length === 0 ? (
            <p className="empty-history">Henüz işlem yapılmadı.</p>
          ) : (
            <ol>
              {history.map((item, index) => (
                <li key={`${item.expression}-${index}`}>
                  <button
                    type="button"
                    className={`history-item ${item.isError ? 'error' : 'success'}`}
                    onClick={() => applyHistoryItem(item)}
                  >
                    {item.expression}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  )
}

export default App
