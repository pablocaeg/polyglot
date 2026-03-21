export interface Token {
  text: string
  isWord: boolean
  index: number // character index in original text
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  const regex = /(\S+)(\s*)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const word = match[1]
    const space = match[2]

    // Separate leading punctuation
    const leadPunct = word.match(/^([¿¡"'«(]+)/)?.[1]
    const trailPunct = word.match(/([.,:;!?"'»)]+)$/)?.[1]
    const core = word.slice(
      leadPunct?.length ?? 0,
      trailPunct ? -trailPunct.length : undefined
    )

    if (leadPunct) {
      tokens.push({ text: leadPunct, isWord: false, index: match.index })
    }

    if (core) {
      tokens.push({
        text: core,
        isWord: true,
        index: match.index + (leadPunct?.length ?? 0),
      })
    }

    if (trailPunct) {
      tokens.push({
        text: trailPunct,
        isWord: false,
        index: match.index + word.length - trailPunct.length,
      })
    }

    if (space) {
      tokens.push({ text: space, isWord: false, index: match.index + word.length })
    }
  }

  return tokens
}
