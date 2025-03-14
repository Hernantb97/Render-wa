-- Agregar nuevas columnas a la tabla conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Actualizar registros existentes
UPDATE conversations
SET message_type = 'message',
    status = 'received'
WHERE message_type IS NULL; 