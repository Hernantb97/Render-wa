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

-- Create a new table with the correct structure
CREATE TABLE IF NOT EXISTS conversations_new (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL DEFAULT '+unknown',  -- Added default value
    message TEXT,
    message_type VARCHAR(50),
    status message_status DEFAULT 'received',
    last_message_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from the old table if it exists
DO $$ 
DECLARE
    fk_record RECORD;
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
        -- Copy all columns including user_id, with a default value for null user_ids
        INSERT INTO conversations_new (
            id, 
            user_id,
            message, 
            message_type, 
            status, 
            last_message_time
        )
        SELECT 
            id,
            COALESCE(user_id::varchar, '+unknown') as user_id,
            message,
            message_type,
            status,
            last_message_time
        FROM conversations;

        -- Store existing foreign key constraint details
        CREATE TEMP TABLE fk_details AS
        SELECT
            tc.table_schema, 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            rc.update_rule,
            rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
            AND tc.table_schema = rc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'messages'
            AND kcu.column_name = 'conversation_id';

        -- Drop the foreign key constraint
        ALTER TABLE messages 
        DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

        -- Drop existing policies on messages table
        DROP POLICY IF EXISTS "Los usuarios pueden ver mensajes de sus conversaciones" ON messages;
        DROP POLICY IF EXISTS "Los usuarios pueden crear mensajes en sus conversaciones" ON messages;
        
        -- Drop the old conversations table
        DROP TABLE conversations;

        -- Rename the new table
        ALTER TABLE conversations_new RENAME TO conversations;

        -- Recreate the foreign key constraint
        FOR fk_record IN SELECT * FROM fk_details LOOP
            EXECUTE format(
                'ALTER TABLE messages ADD CONSTRAINT %I 
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) 
                ON UPDATE %s ON DELETE %s',
                fk_record.constraint_name,
                fk_record.update_rule,
                fk_record.delete_rule
            );
        END LOOP;

        -- Recreate the policies
        CREATE POLICY "Los usuarios pueden ver mensajes de sus conversaciones" ON messages
            FOR SELECT TO anon
            USING (true);

        CREATE POLICY "Los usuarios pueden crear mensajes en sus conversaciones" ON messages
            FOR INSERT TO anon
            WITH CHECK (true);

        -- Drop the temporary table
        DROP TABLE fk_details;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_time ON conversations(last_message_time);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON conversations;
CREATE POLICY "Enable insert for anonymous users" ON conversations
    FOR INSERT TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for anonymous users" ON conversations;
CREATE POLICY "Enable select for anonymous users" ON conversations
    FOR SELECT TO anon
    USING (true);

DROP POLICY IF EXISTS "Enable update for anonymous users" ON conversations;
CREATE POLICY "Enable update for anonymous users" ON conversations
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

-- Tabla de negocios (tus clientes)
CREATE TABLE businesses (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    gupshup_api_key text,
    whatsapp_number text not null,
    plan_type text not null check (plan_type in ('basic', 'premium', 'enterprise')),
    max_concurrent_chats integer,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Tabla de usuarios del negocio
CREATE TABLE business_users (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid references businesses(id),
    user_id uuid references auth.users(id),
    role text not null check (role in ('owner', 'admin', 'agent')),
    is_active boolean default true,
    last_login timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- Tabla de contactos (clientes de tus clientes)
CREATE TABLE contacts (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid references businesses(id),
    phone_number text not null,
    name text,
    tags text[],
    last_interaction timestamp with time zone,
    status text check (status in ('active', 'inactive', 'blocked')),
    created_at timestamp with time zone default now(),
    unique(business_id, phone_number)
);

-- Tabla de conversaciones (modificada)
ALTER TABLE conversations ADD COLUMN
    business_id uuid references businesses(id),
    contact_id uuid references contacts(id),
    agent_id uuid references business_users(id),
    is_resolved boolean default false,
    priority text check (priority in ('low', 'medium', 'high')),
    tags text[],
    metadata jsonb;

-- Política para businesses
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own business"
    ON businesses FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id 
            FROM business_users 
            WHERE business_id = businesses.id
        )
    );

-- Política para conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their business conversations"
    ON conversations FOR SELECT
    USING (
        business_id IN (
            SELECT business_id 
            FROM business_users 
            WHERE user_id = auth.uid()
        )
    );

-- Función para notificar nuevos mensajes
CREATE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'new_message',
        json_build_object(
            'business_id', NEW.business_id,
            'conversation_id', NEW.id,
            'message', NEW.message,
            'timestamp', NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para la notificación
CREATE TRIGGER on_new_message
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();

-- Crear un tipo ENUM para los tipos de archivos
DO $$ BEGIN
    CREATE TYPE file_type AS ENUM (
        'image',
        'document',
        'video',
        'audio'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Agregar columnas para manejar archivos en la tabla conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS file_type file_type,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_size integer;

-- Crear un índice para búsquedas por tipo de archivo
CREATE INDEX IF NOT EXISTS idx_conversations_file_type ON conversations(file_type);

-- Agregar columna de color a la tabla conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS chat_color VARCHAR(7) DEFAULT NULL;

-- Crear índice para búsquedas por color
CREATE INDEX IF NOT EXISTS idx_conversations_chat_color ON conversations(chat_color);

-- Modificar la tabla businesses para quitar is_bot_active
ALTER TABLE businesses 
DROP COLUMN IF EXISTS is_bot_active;

-- Agregar columna de estado del bot a la tabla conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_bot_active boolean DEFAULT true;

-- Crear índice para búsquedas por estado del bot
CREATE INDEX IF NOT EXISTS idx_conversations_bot_status ON conversations(is_bot_active); 