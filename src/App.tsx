import { useEffect, useRef, useState } from 'react'
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

const HISTORY_STORAGE_KEY = 'calculator-history-v2'
const MAX_HISTORY_ITEMS = 15
const LEGACY_HISTORY_STORAGE_KEYS = ['calculator-history-v1', 'calculator-history'] as const
const VALID_OPERATORS: ReadonlySet<Operator> = new Set([
  '+',
  '-',
  '*',
  '/',
  '^',
  '√',
  '%',
  '‰',
  'log',
  'ln',
  'e^x',
  'x²',
  '1/x',
  '|x|',
  'x!',
  'mod',
])
const UNARY_OPERATORS: ReadonlySet<Operator> = new Set([
  'ln',
  'e^x',
  'x²',
  '1/x',
  '|x|',
  'x!',
])

// localStorage'dan okuduğumuz veriyi güvenli kullanmak için basit type guard.
const isHistoryItem = (value: unknown): value is HistoryItem => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const maybeItem = value as Partial<HistoryItem>

  return (
    typeof maybeItem.firstValue === 'string' &&
    typeof maybeItem.secondValue === 'string' &&
    typeof maybeItem.operator === 'string' &&
    VALID_OPERATORS.has(maybeItem.operator as Operator) &&
    typeof maybeItem.result === 'string' &&
    typeof maybeItem.expression === 'string' &&
    typeof maybeItem.isError === 'boolean'
  )
}

// Eski sürüm history kayıtları için (isError alanı olmayan satırlar gibi)
// toleranslı normalize fonksiyonu. Uyumlu formatı yeni shape'e çeviriyoruz.
const normalizeHistoryItem = (value: unknown): HistoryItem | null => {
  if (isHistoryItem(value)) {
    return value
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const maybeItem = value as Partial<HistoryItem>
  if (
    typeof maybeItem.firstValue !== 'string' ||
    typeof maybeItem.secondValue !== 'string' ||
    typeof maybeItem.operator !== 'string' ||
    !VALID_OPERATORS.has(maybeItem.operator as Operator) ||
    typeof maybeItem.result !== 'string' ||
    typeof maybeItem.expression !== 'string'
  ) {
    return null
  }

  return {
    firstValue: maybeItem.firstValue,
    secondValue: maybeItem.secondValue,
    operator: maybeItem.operator as Operator,
    result: maybeItem.result,
    expression: maybeItem.expression,
    // Eski kayıtlarda yoksa başarılı işlem kabul ediyoruz.
    isError: typeof maybeItem.isError === 'boolean' ? maybeItem.isError : false,
  }
}

const isUnaryOperator = (operator: Operator): boolean => UNARY_OPERATORS.has(operator)

// localStorage okuma işini tek yerde topluyoruz.
// useState'in başlangıç değerinde bunu kullanınca StrictMode'da ilk render yazımıyla
// verinin boş diziye ezilmesi riskini de ortadan kaldırmış oluruz.
const readHistoryFromStorage = (): HistoryItem[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const candidateKeys = [HISTORY_STORAGE_KEY, ...LEGACY_HISTORY_STORAGE_KEYS]
    for (const key of candidateKeys) {
      const rawValue = window.localStorage.getItem(key)
      if (!rawValue) {
        continue
      }

      const parsedValue: unknown = JSON.parse(rawValue)
      if (!Array.isArray(parsedValue)) {
        continue
      }

      const normalizedHistory = parsedValue
        .map(normalizeHistoryItem)
        .filter((item): item is HistoryItem => item !== null)
        .slice(0, MAX_HISTORY_ITEMS)

      if (normalizedHistory.length > 0) {
        return normalizedHistory
      }
    }
  } catch {
    // localStorage verisi bozuksa boş geçmiş ile devam ederiz.
  }

  return []
}

// Hesaplama isteğini bir job olarak tutuyoruz.
// Bu sayede hesaplamayı App dışındaki bir component tetikleyebiliyor.
type CalculationJob = {
  id: number
  first: number
  second: number
  operator: Operator
  source: 'equal' | 'chain' | 'unary'
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
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>('basic')
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState<boolean>(false)
  const [isWaitingForSecondValue, setIsWaitingForSecondValue] =
    useState<boolean>(false)
  const [activeVirtualKey, setActiveVirtualKey] = useState<string | null>(null)
  const calculationSequenceRef = useRef<number>(0)
  const handledJobIdsRef = useRef<Set<number>>(new Set())
  const keyFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Kullanıcının yaptığı son işlemleri burada tutuyoruz.
  // En güncel işlem en üstte olacak.
  const [history, setHistory] = useState<HistoryItem[]>(() => readHistoryFromStorage())

  // History değiştikçe localStorage'a yazarak kalıcı hale getiriyoruz.
  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
    } catch {
      // Tarayıcı depolama hatası olsa da uygulama çalışmaya devam etsin.
    }
  }, [history])

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
    if (selectedOperator === 'ln') {
      return `ln(${first}) = ${resultText}`
    }

    if (selectedOperator === 'e^x') {
      return `e^(${first}) = ${resultText}`
    }

    if (selectedOperator === 'x²') {
      return `(${first})² = ${resultText}`
    }

    if (selectedOperator === '1/x') {
      return `1 / (${first}) = ${resultText}`
    }

    if (selectedOperator === '|x|') {
      return `|${first}| = ${resultText}`
    }

    if (selectedOperator === 'x!') {
      return `${first}! = ${resultText}`
    }

    if (selectedOperator === 'log') {
      return `${second} tabanında log(${first}) = ${resultText}`
    }

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

    // Listeyi "en yeni en üstte" tutuyoruz.
    // 10 kayıt sınırı aşılırsa listenin sonundaki (en eski) kayıt otomatik düşer.
    setHistory((previousHistory) => {
      const nextHistory = [historyItem, ...previousHistory]
      if (nextHistory.length > MAX_HISTORY_ITEMS) {
        nextHistory.length = MAX_HISTORY_ITEMS
      }

      return nextHistory
    })
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

  // Klavyeden bir tuşa basılınca ilgili butonu kısa süre "basılmış" gibi gösteriyoruz.
  const flashVirtualKey = (key: string) => {
    setActiveVirtualKey(key)

    if (keyFlashTimeoutRef.current) {
      clearTimeout(keyFlashTimeoutRef.current)
    }

    keyFlashTimeoutRef.current = setTimeout(() => {
      setActiveVirtualKey(null)
    }, 120)
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

  // Backspace davranışı: son girilen karakteri siler.
  const backspaceDisplay = () => {
    if (isWaitingForSecondValue) {
      return
    }

    if (parseNumberInput(displayValue) === null) {
      setDisplayValue('0')
      return
    }

    if (displayValue.length <= 1) {
      setDisplayValue('0')
      return
    }

    const nextValue = displayValue.slice(0, -1)
    if (nextValue === '' || nextValue === '-') {
      setDisplayValue('0')
      return
    }

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

    // Tek operandlı operatörlerde (ln, x², 1/x, |x|, x!) ikinci sayı beklemiyoruz.
    if (isUnaryOperator(selectedOperator)) {
      setStoredValue(null)
      setPendingOperator(null)
      setIsWaitingForSecondValue(true)
      queueCalculationJob({
        first: currentValue,
        second: 0,
        operator: selectedOperator,
        source: 'unary',
      })
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
      : pendingOperator === 'log'
        ? 'Log işleminde ikinci sayı tabandır.'
      : pendingOperator === 'mod'
        ? 'mod işleminde ikinci sayı bölen değerdir.'
      : isDegreeOperator(pendingOperator ?? '+')
        ? 'Seçili işlem derece bekliyor.'
        : isRatioOperator(pendingOperator ?? '+')
          ? 'Seçili işlem oran bekliyor.'
          : 'Rakam girip bir operatör seçebilirsin.'

  // Component kapanırken bekleyen timeout'u temizliyoruz.
  useEffect(() => {
    return () => {
      if (keyFlashTimeoutRef.current) {
        clearTimeout(keyFlashTimeoutRef.current)
      }
    }
  }, [])

  // Klavye desteği:
  // - 0..9       => sayı girişi
  // - . ,        => ondalık ayırıcı
  // - + - * /    => temel 4 işlem
  // - ^          => üs alma (x^n)
  // - e          => e^x hesabı
  // - %          => yüzde hesabı
  // - m          => mod alma
  // - l          => ln(x)
  // - g          => logaritma (tabanlı log)
  // - r          => kök (n√x)
  // - p          => binde (‰) hesabı
  // - s          => kare alma (x²)
  // - i          => tersini alma (1/x)
  // - a          => mutlak değer (|x|)
  // - f          => faktöriyel (x!)
  // - Backspace  => son karakteri sil
  // - Enter / =  => sonucu hesapla
  // - Escape     => temizle (yardım penceresi açıksa önce onu kapatır)
  // - H / ?      => mini klavye kısayol rehberini aç/kapat
  // Not: Ctrl/Meta/Alt kombinasyonlarını özellikle yakalamıyoruz.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      const lowerKey = event.key.toLowerCase()
      const isHelpToggleKey = event.key === '?' || lowerKey === 'h'

      if (isHelpToggleKey) {
        event.preventDefault()
        setIsShortcutHelpOpen((previousState) => !previousState)
        return
      }

      if (isShortcutHelpOpen) {
        if (event.key === 'Escape') {
          event.preventDefault()
          setIsShortcutHelpOpen(false)
        }
        return
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        appendDigit(event.key)
        flashVirtualKey(event.key)
        return
      }

      if (event.key === '.' || event.key === ',') {
        event.preventDefault()
        appendDecimal()
        flashVirtualKey('.')
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        backspaceDisplay()
        return
      }

      if (event.key === 'Enter' || event.key === '=') {
        event.preventDefault()
        handleEqual()
        flashVirtualKey('=')
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        clearAll()
        flashVirtualKey('clear')
        return
      }

      const operatorMap: Record<string, Operator> = {
        '+': '+',
        '-': '-',
        '*': '*',
        '/': '/',
        '^': '^',
        '%': '%',
      }

      if (operatorMap[event.key]) {
        event.preventDefault()
        handleOperatorSelect(operatorMap[event.key])
        flashVirtualKey(operatorMap[event.key])
        return
      }

      if (lowerKey === 'l') {
        event.preventDefault()
        handleOperatorSelect('ln')
        flashVirtualKey('ln')
        return
      }

      if (lowerKey === 'e') {
        event.preventDefault()
        handleOperatorSelect('e^x')
        flashVirtualKey('e^x')
        return
      }

      if (lowerKey === 'g') {
        event.preventDefault()
        handleOperatorSelect('log')
        flashVirtualKey('log')
        return
      }

      if (lowerKey === 'r') {
        event.preventDefault()
        handleOperatorSelect('√')
        flashVirtualKey('√')
        return
      }

      if (lowerKey === 'p') {
        event.preventDefault()
        handleOperatorSelect('‰')
        flashVirtualKey('‰')
        return
      }

      if (lowerKey === 'm') {
        event.preventDefault()
        handleOperatorSelect('mod')
        flashVirtualKey('mod')
        return
      }

      if (lowerKey === 's') {
        event.preventDefault()
        handleOperatorSelect('x²')
        flashVirtualKey('x²')
        return
      }

      if (lowerKey === 'i') {
        event.preventDefault()
        handleOperatorSelect('1/x')
        flashVirtualKey('1/x')
        return
      }

      if (lowerKey === 'a') {
        event.preventDefault()
        handleOperatorSelect('|x|')
        flashVirtualKey('|x|')
        return
      }

      if (lowerKey === 'f') {
        event.preventDefault()
        handleOperatorSelect('x!')
        flashVirtualKey('x!')
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    appendDecimal,
    appendDigit,
    backspaceDisplay,
    calculatorMode,
    clearAll,
    handleEqual,
    handleOperatorSelect,
    isShortcutHelpOpen,
  ])

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
        <h1>calculatorWithReact</h1>
        <p className="subtitle">
          Toplama, çıkarma, çarpma, bölme, üs, kök, logaritma, ln, e^x, yüzde,
          binde, kare, ters, mutlak değer, faktöriyel ve mod
        </p>

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
        <p className="shortcut-hint">
          Klavye kısayol rehberi için <kbd>H</kbd> tuşuna basabilirsin.
        </p>

        {/* Sol blok sayısal tuşlar, sağ blok operatör tuşları */}
        <div className="keypad-layout">
          <div className="number-pad">
            <button
              type="button"
              className={activeVirtualKey === '7' ? 'key-pressed' : ''}
              onClick={() => appendDigit('7')}
            >
              7
            </button>
            <button
              type="button"
              className={activeVirtualKey === '8' ? 'key-pressed' : ''}
              onClick={() => appendDigit('8')}
            >
              8
            </button>
            <button
              type="button"
              className={activeVirtualKey === '9' ? 'key-pressed' : ''}
              onClick={() => appendDigit('9')}
            >
              9
            </button>
            <button
              type="button"
              className={activeVirtualKey === '4' ? 'key-pressed' : ''}
              onClick={() => appendDigit('4')}
            >
              4
            </button>
            <button
              type="button"
              className={activeVirtualKey === '5' ? 'key-pressed' : ''}
              onClick={() => appendDigit('5')}
            >
              5
            </button>
            <button
              type="button"
              className={activeVirtualKey === '6' ? 'key-pressed' : ''}
              onClick={() => appendDigit('6')}
            >
              6
            </button>
            <button
              type="button"
              className={activeVirtualKey === '1' ? 'key-pressed' : ''}
              onClick={() => appendDigit('1')}
            >
              1
            </button>
            <button
              type="button"
              className={activeVirtualKey === '2' ? 'key-pressed' : ''}
              onClick={() => appendDigit('2')}
            >
              2
            </button>
            <button
              type="button"
              className={activeVirtualKey === '3' ? 'key-pressed' : ''}
              onClick={() => appendDigit('3')}
            >
              3
            </button>
            <button
              type="button"
              className={activeVirtualKey === '±' ? 'key-pressed' : ''}
              onClick={toggleSign}
            >
              ±
            </button>
            <button
              type="button"
              className={activeVirtualKey === '0' ? 'key-pressed' : ''}
              onClick={() => appendDigit('0')}
            >
              0
            </button>
            <button
              type="button"
              className={activeVirtualKey === '.' ? 'key-pressed' : ''}
              onClick={appendDecimal}
            >
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
          <button
            type="button"
            className={`equal ${activeVirtualKey === '=' ? 'key-pressed' : ''}`}
            onClick={handleEqual}
          >
            =
          </button>
          <button
            type="button"
            className={`secondary ${activeVirtualKey === 'clear' ? 'key-pressed' : ''}`}
            onClick={clearAll}
          >
            Temizle
          </button>
        </div>
      </main>

      {/* Sağdaki ayrı div: son 15 işlemin tarihçesi */}
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
            <ol className="history-list">
              {history.map((item, index) => (
                <li key={`${item.expression}-${index}`} className="history-row">
                  <span className="history-index">{index + 1}.</span>
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

      {/* H veya ? ile açılan mini kısayol rehberi */}
      {isShortcutHelpOpen && (
        <div
          className="shortcut-backdrop"
          role="presentation"
          onClick={() => setIsShortcutHelpOpen(false)}
        >
          <div
            className="shortcut-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Klavye kısayol rehberi"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Klavye Kısayol Rehberi</h3>
            <ul className="shortcut-list">
              <li>
                <kbd>0</kbd> - <kbd>9</kbd> : Sayı girişi
              </li>
              <li>
                <kbd>.</kbd> / <kbd>,</kbd> : Ondalık ayırıcı
              </li>
              <li>
                <kbd>+</kbd> <kbd>-</kbd> <kbd>*</kbd> <kbd>/</kbd> : 4 işlem
              </li>
              <li className="shortcut-section">
                <strong>Bilimsel kısayollar:</strong>
              </li>
              <li>
                <kbd>^</kbd> : Üs alma (<code>x^n</code>)
              </li>
              <li>
                <kbd>R</kbd> : Kök alma (<code>n√x</code>) — 2. sayı derece
              </li>
              <li>
                <kbd>L</kbd> : Doğal logaritma (<code>ln(x)</code>)
              </li>
              <li>
                <kbd>E</kbd> : Üstel fonksiyon (<code>e^x</code>)
              </li>
              <li>
                <kbd>G</kbd> : Tabanlı logaritma (<code>log(x)</code>) — 2. sayı taban
              </li>
              <li>
                <kbd>%</kbd> : Yüzde hesabı — 2. sayı oran
              </li>
              <li>
                <kbd>P</kbd> : Binde hesabı (<code>‰</code>) — 2. sayı oran
              </li>
              <li>
                <kbd>M</kbd> : Mod alma (<code>x mod y</code>) — 2. sayı bölen
              </li>
              <li>
                <kbd>S</kbd> : Kare alma (<code>x²</code>)
              </li>
              <li>
                <kbd>I</kbd> : Tersini alma (<code>1/x</code>)
              </li>
              <li>
                <kbd>A</kbd> : Mutlak değer (<code>|x|</code>)
              </li>
              <li>
                <kbd>F</kbd> : Faktöriyel (<code>x!</code>)
              </li>
              <li>
                <kbd>Backspace</kbd> : Son girilen rakamı sil
              </li>
              <li>
                <kbd>Enter</kbd> / <kbd>=</kbd> : Hesapla
              </li>
              <li>
                <kbd>Escape</kbd> : Temizle (rehber açıksa önce rehberi kapatır)
              </li>
              <li>
                <kbd>H</kbd> veya <kbd>?</kbd> : Rehberi aç / kapat
              </li>
            </ul>
            <button type="button" onClick={() => setIsShortcutHelpOpen(false)}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
