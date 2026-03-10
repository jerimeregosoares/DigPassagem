-- Adiciona colunas para armazenar coordenadas de embarque
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS boarding_lat FLOAT8;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS boarding_lng FLOAT8;
