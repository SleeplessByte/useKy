# use-ky

⚠️ This has been deprecated. Use [`react-query`](https://react-query.tanstack.com/) in combination with `ky` instead.

Fetch-like hook using [Ky](https://github.com/sindresorhus/ky).

## Installation

```
yarn add use-ky
```

## Usage

```typescript
import { useKy } from 'use-ky'

function MyComponent() {
  const state = useKy(
    'https://example.com', { method: 'post', body: { json: { foo: true } } },
    (response) => response.json<ResponseFormat>()
  )

  console.log(state)
  // => { loading: true, data: null, error: null }
  // => { loading: true, data: '🦄', error: null }
}
```
