-- Adiciona campos de embarque na tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS boarding_address TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS boarding_map_link TEXT;
