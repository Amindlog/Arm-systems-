-- Добавление поля address в таблицу hydrants (если его нет)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hydrants' AND column_name = 'address'
    ) THEN
        ALTER TABLE hydrants ADD COLUMN address TEXT;
    END IF;
END $$;

