````md
# MRR Date Picker (Vanilla JS) — Single Date + Date Range (1 input), Fully Configurable via Attributes

Este projeto adiciona um Date Picker customizado (sem dependências) a qualquer `<input>` com a classe `.mrr-date-picker`.

Principais objetivos:
- **Vanilla JS + CSS** (sem libs).
- **Compatível com WordPress/Bricks** (inclui re-init para DOM dinâmico).
- **Estilo consistente** (visual clean similar aos prints).
- **Auto posicionamento inteligente**:
  - Se faltar espaço abaixo, o calendário **abre para cima** (flip).
  - Se estourar na lateral, **alinha à direita**.
- **Modo Range com 1 único input** (ida/volta) ativado por atributo `date-ranger="true"`.
- **Configuração 100% por atributos** (ano mínimo/máximo fixo ou relativo ao ano atual, min/max de data, bloqueios etc.).
- **Range salvo no mesmo input** (ex.: `2026-01-14|2026-01-20`).

---

## Conteúdo
- [Instalação](#instalação)
- [Como funciona](#como-funciona)
- [Uso rápido](#uso-rápido)
- [Atributos suportados](#atributos-suportados)
  - [Atributos gerais](#atributos-gerais)
  - [Limites min/max e passado/futuro](#limites-minmax-e-passadofuturo)
  - [Bloqueios por dia da semana / mês / datas](#bloqueios-por-dia-da-semana--mês--datas)
  - [Ano mínimo e máximo (fixo e relativo)](#ano-mínimo-e-máximo-fixo-e-relativo)
  - [Range com 1 input (ida/volta)](#range-com-1-input-idavolta)
- [Formato salvo no input (range)](#formato-salvo-no-input-range)
- [Exemplos completos](#exemplos-completos)
  - [Exemplo 1 — Data única simples](#exemplo-1--data-única-simples)
  - [Exemplo 2 — Data única com bloqueios](#exemplo-2--data-única-com-bloqueios)
  - [Exemplo 3 — Range (1 input) com labels custom](#exemplo-3--range-1-input-com-labels-custom)
  - [Exemplo 4 — Range com ano relativo (ano atual +2)](#exemplo-4--range-com-ano-relativo-ano-atual-2)
  - [Exemplo 5 — Range com min/max e bloqueio de finais de semana](#exemplo-5--range-com-minmax-e-bloqueio-de-finais-de-semana)
- [API JS (opcional)](#api-js-opcional)
- [WordPress / Bricks / AJAX (re-init)](#wordpress--bricks--ajax-re-init)
- [Acessibilidade e boas práticas](#acessibilidade-e-boas-práticas)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Licença](#licença)

---

## Instalação

### 1) Adicione o CSS
Cole o CSS do projeto no seu arquivo global (por exemplo `style.css`) ou na área de CSS do builder.

### 2) Adicione o JavaScript
Cole o JS do projeto no seu arquivo global (por exemplo `main.js`) ou via enqueue no WordPress.

Recomendação WordPress (enqueue):
- Inclua o arquivo CSS e JS globalmente ou apenas nas páginas necessárias.

---

## Como funciona

1. O script busca qualquer `input.mrr-date-picker`.
2. Ele cria um wrapper com:
   - Um **input de exibição** (visível, formatado em `dd/mm/aaaa`).
   - Um botão de calendário.
   - Um popover com calendário.
3. O input original vira `type="hidden"` para:
   - Preservar `name="..."` (submissão normal do formulário).
   - Salvar o valor em formato ISO (`YYYY-MM-DD`) ou, no range, `start|end`.

### Regras de posicionamento (Flip/Align)
- Ao abrir, o script mede o espaço livre no viewport:
  - Se o popover não couber abaixo e houver mais espaço acima: adiciona a classe `mrr_dp--flipY`.
  - Se o popover estourar para direita: adiciona `mrr_dp--alignRight`.

---

## Uso rápido

### Data única
```html
<label for="due_date">Data de Vencimento</label>
<input id="due_date" name="due_date" type="date" class="mrr-date-picker" />
````

### Range (1 input só)

```html
<label for="trip_dates">Ida e volta</label>
<input
  id="trip_dates"
  name="trip_dates"
  type="text"
  class="mrr-date-picker"
  date-ranger="true"
/>
```

---

## Atributos suportados

### Atributos gerais

| Atributo                  | Tipo         |       Padrão | O que faz                                      |
| ------------------------- | ------------ | -----------: | ---------------------------------------------- |
| `data-placeholder`        | string       | `dd/mm/aaaa` | Placeholder do campo visível (data única).     |
| `data-week-starts-on`     | `0` ou `1`   |          `0` | 0 = semana começa domingo, 1 = começa segunda. |
| `data-close-on-select`    | `true/false` |       `true` | Fecha o calendário ao selecionar.              |
| `data-allow-manual-input` | `true/false` |       `true` | Permite digitar manualmente (dd/mm/aaaa).      |
| `data-show-outside-days`  | `true/false` |       `true` | Mostra dias do mês anterior/próximo na grade.  |

> Notas:
>
> * `true` pode ser `1`, `true`, `yes`.
> * `false` pode ser `0`, `false`.

---

### Limites min/max e passado/futuro

| Atributo              | Tipo     | Exemplo      | O que faz                          |
| --------------------- | -------- | ------------ | ---------------------------------- |
| `data-min`            | ISO date | `2026-01-10` | Impede selecionar antes de `min`.  |
| `data-max`            | ISO date | `2026-12-31` | Impede selecionar depois de `max`. |
| `data-disable-past`   | bool     | `1`          | Bloqueia datas no passado.         |
| `data-disable-future` | bool     | `1`          | Bloqueia datas no futuro.          |

---

### Bloqueios por dia da semana / mês / datas

| Atributo                | Tipo          | Exemplo                 | O que faz                                |
| ----------------------- | ------------- | ----------------------- | ---------------------------------------- |
| `data-disable-weekdays` | lista `0..6`  | `0,6`                   | Bloqueia dias da semana (0=Dom, 6=Sáb).  |
| `data-disable-months`   | lista `1..12` | `1,2,12`                | Bloqueia meses inteiros (1=Jan, 12=Dez). |
| `data-disable-dates`    | lista ISO     | `2026-01-16,2026-01-20` | Bloqueia datas específicas.              |

---

### Ano mínimo e máximo (fixo e relativo)

O picker permite limitar o dropdown de ano sem mexer em código.

| Atributo               | Tipo     | Exemplo     | Resultado         |
| ---------------------- | -------- | ----------- | ----------------- |
| `data-year-min`        | ano fixo | `2020`      | Ano mínimo = 2020 |
| `data-year-max`        | ano fixo | `2030`      | Ano máximo = 2030 |
| `data-year-min`        | relativo | `-10`       | Ano atual - 10    |
| `data-year-max`        | relativo | `+2`        | Ano atual + 2     |
| `data-year-min`        | relativo | `current-5` | Ano atual - 5     |
| `data-year-max`        | relativo | `current+2` | Ano atual + 2     |
| `data-year-min-offset` | número   | `-3`        | Ano atual - 3     |
| `data-year-max-offset` | número   | `2`         | Ano atual + 2     |

> Prioridade:
>
> * Se `data-year-min`/`data-year-max` existirem, eles definem os limites.
> * `data-year-min-offset`/`data-year-max-offset` são alternativas explícitas.
> * Se o máximo ficar menor que o mínimo, o script ajusta automaticamente.

---

### Range com 1 input (ida/volta)

Para ativar range em 1 input, use:

* `date-ranger="true"` (obrigatório)

Atributos adicionais do range:

| Atributo                       | Tipo   |        Padrão | O que faz                                     |                                    |
| ------------------------------ | ------ | ------------: | --------------------------------------------- | ---------------------------------- |
| `date-ranger`                  | bool   |       `false` | Ativa modo range (ida/volta).                 |                                    |
| `data-range-title`             | string | `Ida e volta` | Título no topo do popover.                    |                                    |
| `data-range-label-start`       | string |         `Ida` | Label da primeira “caixa” (ida).              |                                    |
| `data-range-label-end`         | string |       `Volta` | Label da segunda “caixa” (volta).             |                                    |
| `data-range-placeholder-start` | string |         `Ida` | Placeholder do valor (ida).                   |                                    |
| `data-range-placeholder-end`   | string |       `Volta` | Placeholder do valor (volta).                 |                                    |
| `data-range-require-end`       | bool   |        `true` | Se `true`, botão “Concluído” exige ida+volta. |                                    |
| `data-range-separator`         | string |             ` | `                                             | Separador salvo no input original. |
| `data-range-display-separator` | string |           `–` | Separador exibido no input visível.           |                                    |

---

## Formato salvo no input (range)

No modo range, o valor enviado no submit é gravado no **mesmo input original**:

* Ida + volta:

  * `YYYY-MM-DD|YYYY-MM-DD`
  * Ex.: `2026-01-14|2026-01-20`

* Apenas ida (quando `data-range-require-end="false"`):

  * `YYYY-MM-DD`
  * Ex.: `2026-01-14`

### Parse no PHP (WordPress)

```php
$raw = isset($_POST['trip_dates']) ? sanitize_text_field($_POST['trip_dates']) : '';
$parts = array_map('trim', explode('|', $raw));
$start = $parts[0] ?? '';
$end   = $parts[1] ?? '';
```

---

## Exemplos completos

### Exemplo 1 — Data única simples

```html
<label for="due_date">Data de Vencimento</label>
<input
  id="due_date"
  name="due_date"
  type="date"
  class="mrr-date-picker"
/>
```

---

### Exemplo 2 — Data única com bloqueios

* Não permite passado
* Bloqueia sábado e domingo
* Bloqueia datas específicas
* Limita ano ao atual-2 até atual+1

```html
<label for="delivery_date">Data de entrega</label>
<input
  id="delivery_date"
  name="delivery_date"
  type="text"
  class="mrr-date-picker"
  data-disable-past="1"
  data-disable-weekdays="0,6"
  data-disable-dates="2026-01-16,2026-01-20"
  data-year-min="-2"
  data-year-max="+1"
/>
```

---

### Exemplo 3 — Range (1 input) com labels custom

```html
<label for="stay_period">Período da hospedagem</label>
<input
  id="stay_period"
  name="stay_period"
  type="text"
  class="mrr-date-picker"
  date-ranger="true"
  data-range-title="Período"
  data-range-label-start="Check-in"
  data-range-label-end="Check-out"
  data-range-placeholder-start="Selecione o check-in"
  data-range-placeholder-end="Selecione o check-out"
  data-range-require-end="true"
  data-range-separator="|"
  data-range-display-separator=" – "
/>
```

---

### Exemplo 4 — Range com ano relativo (ano atual +2)

```html
<label for="trip_dates">Ida e volta</label>
<input
  id="trip_dates"
  name="trip_dates"
  type="text"
  class="mrr-date-picker"
  date-ranger="true"
  data-year-min="current-1"
  data-year-max="current+2"
  data-disable-past="1"
/>
```

---

### Exemplo 5 — Range com min/max e bloqueio de finais de semana

```html
<label for="booking_range">Reserva</label>
<input
  id="booking_range"
  name="booking_range"
  type="text"
  class="mrr-date-picker"
  date-ranger="true"

  data-min="2026-01-01"
  data-max="2026-12-31"

  data-disable-weekdays="0,6"
  data-range-title="Reserva"
  data-range-label-start="Entrada"
  data-range-label-end="Saída"
  data-range-require-end="true"
/>
```

---

## API JS (opcional)

O script expõe uma API mínima para casos especiais:

```js
window.MRRDatePicker.init(rootElement);
window.MRRDatePicker.enhance(inputElement);
window.MRRDatePicker.open(originalInput);
window.MRRDatePicker.close(originalInput);
window.MRRDatePicker.getValue(originalInput);
window.MRRDatePicker.setValue(originalInput, valueString);
```

### Exemplo: reinicializar após inserir HTML dinamicamente

```js
MRRDatePicker.init(document);
```

### Exemplo: setar valor via JS (range)

```js
const input = document.querySelector('input[name="trip_dates"]');
MRRDatePicker.setValue(input, '2026-01-14|2026-01-20');
```

---

## WordPress / Bricks / AJAX (re-init)

Em builders (ex.: Bricks) é comum inputs entrarem no DOM depois do carregamento (popup, tabs, repeater).

Sempre que inserir novos inputs `.mrr-date-picker`, chame:

```js
MRRDatePicker.init(document);
```

Se você tiver um hook/evento do Bricks para “popup open”, dispare o init dentro desse evento.

---

## Acessibilidade e boas práticas

* O input visível mantém foco e teclado (Enter valida, Esc fecha).
* O calendário usa botões clicáveis e foco.
* Labels: preferível usar `for="id"` no `<label>` apontando para o input.

  * O script move o `id` do input original para o input visível, para manter `label for` funcionando.

---

## Troubleshooting

### 1) O label não foca o input

* Use `label for="meu_id"` e o input deve ter `id="meu_id"`.
* Evite `id` duplicado no DOM.

### 2) O calendário abre fora da tela

* O script já faz flip e align automaticamente.
* Se seu layout usa `overflow:hidden` em containers pai, o popover pode ser cortado.

  * Solução: remova/ajuste overflow do container pai ou mova o componente para um container que não corte.

### 3) Inputs inseridos por AJAX não ganham o date picker

* Chame `MRRDatePicker.init(document)` após inserir o HTML.

### 4) Range não salva os dois valores

* Confirme que o input tem `date-ranger="true"`.
* Confirme que `name="..."` está no input original (o script preserva isso).

---

## Roadmap

Possíveis extensões:

* Presets de ranges (ex.: “últimos 7 dias”, “este mês”).
* Bloqueio por regras avançadas via atributo (ex.: “apenas dias úteis”, feriados via JSON).
* Modo mobile opcional usando picker nativo.

---

## Licença

Defina conforme sua preferência (MIT é comum para plugins utilitários).

```
```
