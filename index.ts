import { useReducer, useEffect, Reducer, useDebugValue  } from 'react'
import ky, { Options, ResponsePromise } from 'ky'

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export type KyInput = Request | URL | string | null
export type KyOptions = OptionsWithoutBody | OptionsWithBody

interface OptionsWithoutBody extends Omit<Options, 'body'> {
	method?: 'get' | 'head'
}

interface OptionsWithBody extends Options {
	method?: 'post' | 'put' | 'delete'
}

export type KyState<T, E extends Error = Error> = { loading: boolean, error: E | null, data: T | null }
type KyAction<T, E extends Error = Error> = InitAction | StartAction | DataAction<T> | ErrorAction<E>

type InitAction = { type: 'init' }
type StartAction = { type: 'start' }
type DataAction<T> = { type: 'data', data: T }
type ErrorAction<E extends Error = Error> = { type: 'error', error: E }

function reducer<T, E extends Error = Error>(state: KyState<T, E>, action: KyAction<T, E>) {
  switch (action.type) {
    case 'init':
      return initialState;
    case 'start':
      return state.loading ? state : { ...state, loading: true }
    case 'data':
      return state.loading ? { ...state, loading: false, data: action.data } : state
    case 'error':
      return state.loading ? { ...state, loading: false, error: action.error } : state
    default:
      throw new Error('no such action type');
  }
}
const initialState: KyState<any, any> = { loading: false, error: null, data: null }

export type unwrap<T> = (a: ResponsePromise) => Promise<T>
const noop = () => {}

/**
 * Accepts an input and options bag that are passed to ky.
 *
 * @param {KyInput} input the input (url) for ky
 * @param {KyOptions} options the options bag for ky
 * @param {unwrap<T>} unwrap the function to go from a successful response to T
 *
 * @type {T} The body after it's unwrapped
 * @type {E} The error type, usually Error
 *
 * @see ky
 * @see useEffect
 *
 * @note Because this uses useEffect and useReducer and an action is dispatch
 *   before the request (to set loading to true) and after it finishes (to set
 *   loading to false and data or error to something), expect the component to
 *   render at least 2 additional times.
 *
 * @returns {KyState<T, E>} the state of the request
 */
export function useKy<T, E extends Error = Error>(input: KyInput, options: KyOptions = {}, unwrap: unwrap<T>): KyState<T, E> {
  const [state, dispatch] = useReducer<Reducer<KyState<T, E>, KyAction<T, E>>>(reducer, initialState)
  useDebugValue(input)

  useEffect(() => {
    if (!input) {
      return () => {}
    }

    let mountedDispatch = (action: KyAction<T, E>) => dispatch(action)

    const abortController = new AbortController()
    const { signal } = abortController

    mountedDispatch({ type: 'start' })

    const handleError = (err: any) => mountedDispatch({ type: 'error', error: err })
    const handleSuccess = (data: T) => mountedDispatch({ type: 'data', data })

    unwrap(ky(input, { ...options, signal }))
      .then(handleSuccess)
      .catch(handleError)

    return () => {
      mountedDispatch = noop
      abortController.abort()

      // destroy state
      dispatch({ type: 'init' })
    }

  }, [input, options.method, ...Object.keys(options.headers || {}), ...Object.values(options.headers || {})])

  return state
}

/**
 * Accepts an input and options bag that are passed to ky, unwrap as JSON.
 *
 * @param {KyInput} input the input (url) for ky
 * @param {KyOptions} options the options bag for ky
 *
 * @type {T} The body after it's parsed as JSON
 *
 * @see useKy
 *
 * @returns {KyState<T, E>} the state of the request
 */
export function useKyJson<T, E extends Error = Error>(input: KyInput, options: KyOptions = {}): KyState<T, E> {
  return useKy<T, E>(input, options, (response) => response.json<T>())
}
