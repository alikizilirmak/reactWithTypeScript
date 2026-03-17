import { useState } from 'react'
import './App.css'

// Uygulamada desteklenen işlemler için bir union type tanımlıyoruz.
// Böylece yanlış bir operatör değerini TypeScript derleme aşamasında yakalar.
type Operator = '+' | '-' | '*' | '/' | '^' | '√'

type HistoryItem = {
  firstValue: string
  secondValue: string
  operator: Operator
  result: string
  expression: string
  isError: boolean
}

function App() {
  // Input alanlarından gelen değerleri string olarak tutuyoruz.
  // Çünkü HTML input'lar değeri her zaman string döndürür.
  const [firstValue, setFirstValue] = useState<string>('')
  const [secondValue, setSecondValue] = useState<string>('')

  // Varsayılan işlem toplama olsun.
  const [operator, setOperator] = useState<Operator>('+')

  // Hesaplanan sonucu ekranda göstermek için state.
  // Başlangıçta "0" gösteriyoruz.
  const [result, setResult] = useState<string>('0')

  // Kullanıcının yaptığı son işlemleri burada tutuyoruz.
  // En güncel işlem en üstte olacak.
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Input'a yazılırken sadece sayıya uygun karakterlere izin veriyoruz.
  // Böylece "e" gibi değerler daha giriş aşamasında engellenir.
  const updateNumberInput = (
    rawValue: string,
    setValue: (nextValue: string) => void,
  ) => {
    const normalizedValue = rawValue.replace(',', '.')
    const isValidPartialNumber = /^-?\d*(\.\d*)?$/.test(normalizedValue)

    if (isValidPartialNumber) {
      setValue(normalizedValue)
    }
  }

  // Hesaplama anında değerin gerçekten geçerli sayı olup olmadığını kesin kontrol ediyoruz.
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

  // Geçmişte görünecek ifade metnini tek noktadan üretmek okunabilirliği artırır.
  const buildExpression = (
    first: string,
    selectedOperator: Operator,
    second: string,
    resultText: string,
  ): string => {
    if (selectedOperator === '√') {
      return `${second}. dereceden kök(${first}) = ${resultText}`
    }

    return `${first} ${selectedOperator} ${second} = ${resultText}`
  }

  // Verilen değerlerle geçmiş kaydı oluşturuyoruz.
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

  // Hesapla butonuna basılınca çalışacak fonksiyon.
  const calculate = () => {
    const first = parseNumberInput(firstValue)
    const second = parseNumberInput(secondValue)

    // Geçersiz sayı kontrolü (ör. kullanıcı beklenmedik bir değer girdiyse).
    if (first === null || second === null) {
      const errorResult = 'Lütfen geçerli sayılar girin.'
      setResult(errorResult)
      addToHistoryByValues(firstValue, secondValue, operator, errorResult, true)
      return
    }

    // Matematiksel olarak tanımsız durum: 0'a bölme.
    if (operator === '/' && second === 0) {
      const errorResult = '0 ile bölme yapılamaz.'
      setResult(errorResult)
      addToHistory(first, second, operator, errorResult, true)
      return
    }

    // Kök işleminde derece 0 olamaz.
    if (operator === '√' && second === 0) {
      const errorResult = 'Kök derecesi 0 olamaz.'
      setResult(errorResult)
      addToHistory(first, second, operator, errorResult, true)
      return
    }

    // Hesaplama sonucu bu değişkende tutulacak.
    let calculation = 0

    // Seçilen operatöre göre ilgili işlemi yapıyoruz.
    switch (operator) {
      case '+':
        calculation = first + second
        break
      case '-':
        calculation = first - second
        break
      case '*':
        calculation = first * second
        break
      case '/':
        calculation = first / second
        break
      case '^':
        calculation = first ** second
        break
      case '√': {
        // Negatif sayının çift dereceden kökü reel sayı değildir.
        if (first < 0) {
          if (!Number.isInteger(second)) {
            const errorResult = 'Negatif sayıda derece tam sayı olmalı.'
            setResult(errorResult)
            addToHistory(first, second, operator, errorResult, true)
            return
          }

          if (Math.abs(second) % 2 === 0) {
            const errorResult = 'Negatif sayının çift dereceden kökü yoktur.'
            setResult(errorResult)
            addToHistory(first, second, operator, errorResult, true)
            return
          }

          // Tek derecede işareti koruyarak kök alıyoruz.
          const rootValue = Math.pow(Math.abs(first), 1 / Math.abs(second))
          calculation = second > 0 ? -rootValue : -1 / rootValue
          break
        }

        calculation = Math.pow(first, 1 / second)
        break
      }
      default:
        calculation = 0
    }

    // Sayısal sonucu string'e çevirip ekrana yansıtıyoruz.
    const resultText = calculation.toString()
    setResult(resultText)

    // Yeni işlemi geçmişe ekleyip sadece son 10 kaydı tutuyoruz.
    addToHistory(first, second, operator, resultText)
  }

  // Formu başlangıç haline döndürmek için ayrı bir fonksiyon yazıyoruz.
  // Bu yaklaşım, "tek sorumluluk" prensibi açısından daha temizdir:
  // calculate sadece hesaplar, clearValues sadece temizler.
  const clearValues = () => {
    setFirstValue('')
    setSecondValue('')
    setOperator('+')
    setResult('0')
  }

  // Sadece geçmiş kayıtlarını temizlemek için ayrı bir fonksiyon.
  const clearHistory = () => {
    setHistory([])
  }

  // Geçmişten bir satıra tıklanınca ilgili verileri tekrar forma yüklüyoruz.
  const applyHistoryItem = (item: HistoryItem) => {
    setFirstValue(item.firstValue)
    setSecondValue(item.secondValue)
    setOperator(item.operator)
    setResult(item.result)
  }

  const secondInputPlaceholder =
    operator === '^' || operator === '√' ? 'derece' : '2. sayı'

  return (
    // Layout'u iki kolona ayırıyoruz: solda hesap makinesi, sağda işlem geçmişi.
    <div className="app-layout">
      {/* Uygulamanın hesaplama tarafı */}
      <main className="calculator">
        <h1>Mini Hesap Makinesi</h1>
        <p>Toplama, çıkarma, çarpma, bölme, üs ve kök alma</p>

        {/* İlk sayı, işlem ve ikinci sayı alanlarını tek satırda topluyoruz. */}
        <div className="inputs">
          <input
            type="text"
            inputMode="decimal"
            placeholder="1. sayı"
            value={firstValue}
            // Input değişince state'i güncelliyoruz (controlled input yapısı).
            onChange={(event) =>
              updateNumberInput(event.target.value, setFirstValue)
            }
          />
          <select
            aria-label="İşlem seç"
            value={operator}
            // Select string döndürdüğü için Operator tipine cast ediyoruz.
            onChange={(event) => setOperator(event.target.value as Operator)}
          >
            <option value="+">+</option>
            <option value="-">-</option>
            <option value="*">*</option>
            <option value="/">/</option>
            <option value="^">x^n</option>
            <option value="√">n√x</option>
          </select>
          <input
            type="text"
            inputMode="decimal"
            placeholder={secondInputPlaceholder}
            value={secondValue}
            // İkinci sayı değeri değiştikçe state güncellenir.
            onChange={(event) =>
              updateNumberInput(event.target.value, setSecondValue)
            }
          />
        </div>

        {(operator === '^' || operator === '√') && (
          <p className="input-hint">
            Bu işlemde ikinci alan derece olarak kullanılır.
          </p>
        )}

        {/* İki aksiyonu birlikte göstermek için butonları bir grupta tutuyoruz. */}
        <div className="actions">
          {/* Buton tıklaması hesaplama fonksiyonunu tetikler. */}
          <button type="button" onClick={calculate}>
            Hesapla
          </button>

          {/* Temizle butonu tüm inputları ve sonucu varsayılan hale döndürür. */}
          <button type="button" className="secondary" onClick={clearValues}>
            Temizle
          </button>
        </div>

        {/* Sonuç alanı her hesaplamadan sonra state üzerinden otomatik güncellenir. */}
        <div className="result">
          <span>Sonuç:</span> {result}
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
                    className={`history-item${item.isError ? ' error' : ''}`}
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
