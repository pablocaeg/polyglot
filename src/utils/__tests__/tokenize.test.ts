import { describe, it, expect } from 'vitest'
import { tokenize } from '../tokenize'

describe('tokenize', () => {
  it('splits simple text into word tokens and spaces', () => {
    const tokens = tokenize('Hello world')
    const words = tokens.filter((t) => t.isWord)
    expect(words).toHaveLength(2)
    expect(words[0].text).toBe('Hello')
    expect(words[1].text).toBe('world')
  })

  it('separates leading punctuation', () => {
    const tokens = tokenize('¿Hola?')
    expect(tokens[0]).toEqual({ text: '¿', isWord: false, index: 0 })
    expect(tokens[1]).toEqual({ text: 'Hola', isWord: true, index: 1 })
    expect(tokens[2]).toEqual({ text: '?', isWord: false, index: 5 })
  })

  it('separates trailing punctuation', () => {
    const tokens = tokenize('Hello, world!')
    const words = tokens.filter((t) => t.isWord)
    expect(words[0].text).toBe('Hello')
    expect(words[1].text).toBe('world')
    // comma and exclamation should be separate non-word tokens
    const puncts = tokens.filter((t) => !t.isWord && t.text.trim())
    expect(puncts.some((p) => p.text === ',')).toBe(true)
    expect(puncts.some((p) => p.text === '!')).toBe(true)
  })

  it('handles quoted text', () => {
    const tokens = tokenize('"Hello"')
    const words = tokens.filter((t) => t.isWord)
    expect(words).toHaveLength(1)
    expect(words[0].text).toBe('Hello')
  })

  it('preserves character indices', () => {
    const text = 'one two'
    const tokens = tokenize(text)
    const words = tokens.filter((t) => t.isWord)
    expect(text.slice(words[0].index, words[0].index + words[0].text.length)).toBe('one')
    expect(text.slice(words[1].index, words[1].index + words[1].text.length)).toBe('two')
  })

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([])
  })

  it('handles multiple spaces between words', () => {
    const tokens = tokenize('hello   world')
    const words = tokens.filter((t) => t.isWord)
    expect(words).toHaveLength(2)
  })

  it('handles inverted punctuation (Spanish)', () => {
    const tokens = tokenize('¡Hola!')
    expect(tokens[0].text).toBe('¡')
    expect(tokens[0].isWord).toBe(false)
    expect(tokens[1].text).toBe('Hola')
    expect(tokens[1].isWord).toBe(true)
  })

  it('handles guillemets (French quotes)', () => {
    const tokens = tokenize('«bonjour»')
    const words = tokens.filter((t) => t.isWord)
    expect(words).toHaveLength(1)
    expect(words[0].text).toBe('bonjour')
  })
})
