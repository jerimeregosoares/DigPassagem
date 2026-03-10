-- Garante que as colunas existam (idempotente)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'webhook_url') THEN
        ALTER TABLE campaigns ADD COLUMN webhook_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'draw_results') THEN
        ALTER TABLE campaigns ADD COLUMN draw_results JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Habilita RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Public campaigns are viewable by everyone" ON campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON campaigns;

-- Cria novas políticas
CREATE POLICY "Public campaigns are viewable by everyone" 
ON campaigns FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own campaigns" 
ON campaigns FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" 
ON campaigns FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" 
ON campaigns FOR DELETE 
USING (auth.uid() = user_id);
