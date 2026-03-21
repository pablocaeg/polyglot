import type { LanguageDirection, SkillLevel, TextCategory } from '../types'

const LANG_NAMES: Record<string, string> = {
  pl: 'Polish', es: 'Spanish', en: 'English',
  fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', nl: 'Dutch',
}

const LEVEL_DESCRIPTIONS: Record<SkillLevel, string> = {
  A1: 'A1 level. Use the most basic vocabulary (200-300 most common words), very short sentences (3-6 words), present tense only, simple subject-verb-object structure. Write 4-6 sentences (at least 30 words total).',
  A2: 'A2 level. Use simple vocabulary (most common 500 words), short sentences (5-8 words), present tense with some past tense. Write 6-8 sentences (at least 50 words total).',
  B1: 'B1 level. Use common vocabulary (1500 words), compound sentences, past and future tenses. Write 8-10 sentences (at least 80 words total).',
  B2: 'B2 level. Use broader vocabulary including some idioms, complex sentences, all tenses including conditional. Write 10-12 sentences (at least 100 words total).',
  C1: 'C1 level. Use rich vocabulary including idioms and colloquial expressions, complex grammar, subjunctive mood where appropriate. Write 12-14 sentences (at least 130 words total).',
  C2: 'C2 level. Use sophisticated vocabulary, literary expressions, complex nested sentences, nuanced grammar. Write 14-18 sentences (at least 160 words total).',
}

/** Phase 1: Generate the text + translation only (fast, small response) */
export function buildTextPrompt(
  direction: LanguageDirection,
  skillLevel: SkillLevel,
  topic?: string,
  category?: TextCategory
) {
  const targetLang = LANG_NAMES[direction.target]
  const nativeLang = LANG_NAMES[direction.native]
  const levelDesc = LEVEL_DESCRIPTIONS[skillLevel]

  let topicInstruction = topic
    ? `The text should be about: "${topic}".`
    : 'Choose an interesting, everyday topic (culture, travel, food, daily life, etc.).'

  if (category) {
    topicInstruction += ` The text should fit the category: ${category}.`
  }

  const systemPrompt = `You are a language learning content generator. You create texts in ${targetLang} for ${nativeLang} speakers. Respond with valid JSON only.`

  const userPrompt = `Generate a text in ${targetLang} at this level:
${levelDesc}

${topicInstruction}

IMPORTANT: The text must meet the minimum sentence and word count above. Do not write less.

Respond with this exact JSON:
{
  "title": "Title in ${targetLang}",
  "content": "The full text in ${targetLang}",
  "fullTranslation": "Complete translation in ${nativeLang}"
}`

  return { systemPrompt, userPrompt }
}

/** Phase 2: Generate word translations for an existing text */
export function buildVocabPrompt(
  direction: LanguageDirection,
  skillLevel: SkillLevel,
  textContent: string
) {
  const targetLang = LANG_NAMES[direction.target]
  const nativeLang = LANG_NAMES[direction.native]

  const systemPrompt = `You are a language dictionary. Extract vocabulary from the given ${targetLang} text and translate to ${nativeLang}. Write ALL text fields (translation, grammar) in ${nativeLang}. Respond with valid JSON only, no markdown.`

  const userPrompt = `Extract EVERY single word from this ${targetLang} text and provide translations for a ${skillLevel} learner:

"${textContent}"

Respond with this JSON:
{
  "wordTranslations": [
    {"word": "word exactly as it appears in the text", "translation": "${nativeLang} translation", "pos": "noun/verb/adj/adv/prep/conj/pron/art/num/interj", "grammar": "brief note in ${nativeLang}"}
  ]
}

CRITICAL rules:
- Include EVERY word from the text, no exceptions — articles (el, la, the, a), prepositions (de, en, w, z, in, on), conjunctions (y, i, and, but), pronouns, etc.
- The "word" field MUST match exactly how the word appears in the text (including inflected/conjugated forms like "comieron" not "comer")
- If a word appears in multiple forms, include EACH form separately
- Do NOT skip small/common words — they are the most important for beginners
- "pos": noun, verb, adj, adv, prep, conj, pron, art, num, interj
- "grammar": write in ${nativeLang}. For verbs: tense/person/base form. For nouns: gender/number
- "translation": must be in ${nativeLang}`

  return { systemPrompt, userPrompt }
}

/** Legacy: combined prompt (kept for backward compat) */
export function buildPrompt(
  direction: LanguageDirection,
  skillLevel: SkillLevel,
  topic?: string,
  category?: TextCategory
) {
  const targetLang = LANG_NAMES[direction.target]
  const nativeLang = LANG_NAMES[direction.native]
  const levelDesc = LEVEL_DESCRIPTIONS[skillLevel]

  let topicInstruction = topic
    ? `The text should be about: "${topic}".`
    : 'Choose an interesting, everyday topic (culture, travel, food, daily life, etc.).'

  if (category) {
    topicInstruction += ` The text should fit the category: ${category}.`
  }

  const systemPrompt = `You are a language learning content generator. You create texts in ${targetLang} for ${nativeLang} speakers learning ${targetLang}. Always respond with valid JSON only, no markdown or extra text.`

  const userPrompt = `Generate a short text in ${targetLang} for a learner at the following level:
${levelDesc}

${topicInstruction}

Respond with this exact JSON structure:
{
  "title": "A short title for the text in ${targetLang}",
  "content": "The full text in ${targetLang}",
  "fullTranslation": "Complete translation of the text in ${nativeLang}",
  "wordTranslations": [
    {"word": "word in ${targetLang}", "translation": "translation in ${nativeLang}", "pos": "noun/verb/adj/etc", "grammar": "brief grammar note"}
  ]
}

CRITICAL:
- Include EVERY word from the text in wordTranslations — no exceptions. Include articles, prepositions, conjunctions, pronouns, even the smallest words.
- The "word" field must match EXACTLY how the word appears in the text (inflected forms like "comieron" not "comer"). If a word appears in multiple forms, include each form.
- Do NOT skip common/small words — they matter most for beginners.
- The "pos" field should be one of: noun, verb, adj, adv, prep, conj, pron, art, num, interj
- The "grammar" field must be written in ${nativeLang}: for verbs include tense/person/base form, for nouns include gender/number
- The "translation" field must be in ${nativeLang}
- Ensure the translation is natural and idiomatic in ${nativeLang}`

  return { systemPrompt, userPrompt }
}
