-- Primero, eliminamos la restricción existente si existe
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_status_check;

-- First, create the ENUM type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE message_status AS ENUM (
        'received',
        'sent',
        'delivered',
        'enqueued',
        'read',
        'pending'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add the columns if they don't exist (as VARCHAR initially)
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Add a temporary column with the new type
ALTER TABLE conversations 
ADD COLUMN status_enum message_status;

-- Update the temporary column with converted values
UPDATE conversations
SET status_enum = CASE 
    WHEN status IS NULL OR status = '' THEN 'received'::message_status
    WHEN status IN ('received', 'sent', 'delivered', 'enqueued', 'read', 'pending') THEN status::message_status
    ELSE 'received'::message_status
END;

-- Drop the old status column
ALTER TABLE conversations DROP COLUMN status;

-- Rename the new column
ALTER TABLE conversations RENAME COLUMN status_enum TO status;

-- Update message_type for existing records if needed
UPDATE conversations
SET message_type = CASE 
    WHEN message_type IS NULL OR message_type = '' THEN 'message'
    ELSE message_type
END;

CREATE POLICY "Enable insert for authenticated users" ON "public"."conversations"
FOR INSERT TO anon
WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."conversations"
FOR SELECT TO anon
USING (true);

CREATE POLICY "Enable update for users based on user_id" ON "public"."conversations"
FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY; 