-- Remover a restrição de unicidade da coluna phone para permitir múltiplos clientes com o mesmo número
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_key;

-- Nota: A restrição de unicidade do CPF (customers_cpf_key) deve ser mantida.
