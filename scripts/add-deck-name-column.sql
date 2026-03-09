-- Add deck_name column to decklists table
-- This allows users to save multiple variations of the same commander deck
ALTER TABLE decklists ADD COLUMN IF NOT EXISTS deck_name TEXT;

-- Backfill existing decks: use commander name as deck_name
UPDATE decklists SET deck_name = commander WHERE deck_name IS NULL AND commander IS NOT NULL;
