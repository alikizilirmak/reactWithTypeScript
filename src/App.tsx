import { useState } from 'react'
import './App.css'

// Sadece bu 4 işlem desteklensin diye bir union type tanımlıyoruz.
// Böylece yanlış bir operatör değerini TypeScript derleme aşamasında yakalar.
type Operator = '+' | '-' | '*' | '/'

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
  const [history, setHistory] = useState<string[]>([])

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

  // Hesapla butonuna basılınca çalışacak fonksiyon.
  const calculate = () => {
    const first = parseNumberInput(firstValue)
    const second = parseNumberInput(secondValue)

    // Geçersiz sayı kontrolü (ör. kullanıcı beklenmedik bir değer girdiyse).
    if (first === null || second === null) {
      setResult('Lütfen geçerli sayılar girin.')
      return
    }

    // Matematiksel olarak tanımsız durum: 0'a bölme.
    if (operator === '/' && second === 0) {
      const errorResult = '0 ile bölme yapılamaz.'
      setResult(errorResult)

      // Hatalı da olsa denenen işlemi geçmişte göstermek kullanıcıya yardımcı olur.
      setHistory((previousHistory) =>
        [`${first} ${operator} ${second} = ${errorResult}`, ...previousHistory].slice(
          0,
          10,
        ),
      )
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
      default:
        calculation = 0
    }

    // Sayısal sonucu string'e çevirip ekrana yansıtıyoruz.
    setResult(calculation.toString())

    // Yeni işlemi geçmişe ekleyip sadece son 10 kaydı tutuyoruz.
    setHistory((previousHistory) =>
      [`${first} ${operator} ${second} = ${calculation}`, ...previousHistory].slice(
        0,
        10,
      ),
    )
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

  return (
    // Layout'u iki kolona ayırıyoruz: solda hesap makinesi, sağda işlem geçmişi.
    <div className="app-layout">
      {/* Uygulamanın hesaplama tarafı */}
      <main className="calculator">
        <h1>Mini Hesap Makinesi</h1>
        <p>Toplama, çıkarma, çarpma ve bölme</p>

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
          </select>
          <input
            type="text"
            inputMode="decimal"
            placeholder="2. sayı"
            value={secondValue}
            // İkinci sayı değeri değiştikçe state güncellenir.
            onChange={(event) =>
              updateNumberInput(event.target.value, setSecondValue)
            }
          />
        </div>

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
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  )
}

export default App
