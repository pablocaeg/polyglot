-- Polyglot PostgreSQL Schema
-- Run: psql $DATABASE_URL < scripts/schema.sql

BEGIN;

-- ─── Dictionary entries (one row per word-form per language) ───────────────

CREATE TABLE IF NOT EXISTS dictionary_entries (
  id         BIGSERIAL PRIMARY KEY,
  lang       VARCHAR(2)  NOT NULL,      -- 'es', 'pl', etc.
  word       TEXT        NOT NULL,      -- lowercase normalized
  word_display TEXT      NOT NULL,      -- original casing
  lemma      TEXT,                      -- base form (comieron → comer)
  pos        VARCHAR(10),               -- noun, verb, adj, adv, prep, conj, pron, art, num, interj
  grammar    JSONB,                     -- {gender, tense, person, ...}
  frequency  INTEGER,                   -- corpus rank (lower = more common)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lang, word, pos)
);

CREATE INDEX IF NOT EXISTS idx_dict_lang_word   ON dictionary_entries (lang, word);
CREATE INDEX IF NOT EXISTS idx_dict_lang_lemma  ON dictionary_entries (lang, lemma);
CREATE INDEX IF NOT EXISTS idx_dict_frequency   ON dictionary_entries (lang, frequency);

-- ─── Bilingual translations (many-to-many across entries) ─────────────────

CREATE TABLE IF NOT EXISTS translations (
  id               BIGSERIAL PRIMARY KEY,
  source_entry_id  BIGINT      NOT NULL REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  target_lang      VARCHAR(2)  NOT NULL,
  translation      TEXT        NOT NULL,
  grammar_note     TEXT,
  source           VARCHAR(20) DEFAULT 'wiktionary',  -- 'wiktionary', 'freedict', 'llm'
  confidence       REAL        DEFAULT 1.0,            -- 1.0 for dict, 0.7 for LLM
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_entry_id, target_lang, translation)
);

CREATE INDEX IF NOT EXISTS idx_trans_source_target ON translations (source_entry_id, target_lang);

-- ─── Pre-generated texts ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS texts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_lang      VARCHAR(2)  NOT NULL,
  native_lang      VARCHAR(2)  NOT NULL,
  skill_level      VARCHAR(15) NOT NULL,
  category         VARCHAR(20),
  title            TEXT        NOT NULL,
  content          TEXT        NOT NULL,
  full_translation TEXT        NOT NULL,
  word_count       INTEGER,
  generated_by     VARCHAR(20) DEFAULT 'deepseek',  -- 'deepseek', 'claude'
  served_count     INTEGER     DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_lang, native_lang, content)
);

CREATE INDEX IF NOT EXISTS idx_texts_combo ON texts (target_lang, native_lang, skill_level, category);
CREATE INDEX IF NOT EXISTS idx_texts_served ON texts (served_count);

-- ─── Pre-computed vocabulary for each text ────────────────────────────────

CREATE TABLE IF NOT EXISTS text_vocabulary (
  id          BIGSERIAL PRIMARY KEY,
  text_id     UUID      NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  word        TEXT      NOT NULL,
  word_lower  TEXT      NOT NULL,
  translation TEXT      NOT NULL,
  pos         VARCHAR(10),
  grammar     TEXT,
  word_order  INTEGER,
  UNIQUE(text_id, word_lower, pos)
);

CREATE INDEX IF NOT EXISTS idx_textvocab_text ON text_vocabulary (text_id);

-- ─── Generation job tracking ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS generation_jobs (
  id              BIGSERIAL   PRIMARY KEY,
  target_lang     VARCHAR(2)  NOT NULL,
  native_lang     VARCHAR(2)  NOT NULL,
  skill_level     VARCHAR(15) NOT NULL,
  category        VARCHAR(20) NOT NULL,
  target_count    INTEGER     DEFAULT 10,
  completed_count INTEGER     DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'running', 'done', 'error'
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_lang, native_lang, skill_level, category)
);

COMMIT;
