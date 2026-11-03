-- Apply after the core schema. Keeps feedback text validation in PostgreSQL.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='complaint'::regclass AND conname='complaint_text_length') THEN
  ALTER TABLE complaint ADD CONSTRAINT complaint_text_length CHECK (char_length(btrim(complaint_text)) BETWEEN 10 AND 2000);
 END IF;
END $$;
