import type { Layout, MergeDirection } from '../components/DiffView'
import type { LanguageChoice } from './languages'

export interface Options {
  layout: Layout
  direction: MergeDirection
  wrap: boolean
  collapse: boolean
  language: LanguageChoice
  ignoreWhitespace: boolean
  ignoreCase: boolean
  saveHistory: boolean
}

export const DEFAULT_OPTIONS: Options = {
  layout: 'split',
  direction: 'b-to-a',
  wrap: true,
  collapse: true,
  language: 'auto',
  ignoreWhitespace: true,
  ignoreCase: false,
  saveHistory: true,
}
