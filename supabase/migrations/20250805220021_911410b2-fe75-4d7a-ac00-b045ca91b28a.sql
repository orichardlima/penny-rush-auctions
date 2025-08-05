-- Criar alguns bots para o sistema
INSERT INTO public.profiles (user_id, full_name, email, is_bot, bids_balance) VALUES
  (gen_random_uuid(), 'Ana Silva', 'ana.bot@sistema.com', true, 999999999),
  (gen_random_uuid(), 'Carlos Santos', 'carlos.bot@sistema.com', true, 999999999),
  (gen_random_uuid(), 'Maria Oliveira', 'maria.bot@sistema.com', true, 999999999),
  (gen_random_uuid(), 'João Pereira', 'joao.bot@sistema.com', true, 999999999),
  (gen_random_uuid(), 'Fernanda Costa', 'fernanda.bot@sistema.com', true, 999999999);

-- Testar criação de bot aleatório
SELECT get_random_bot() as bot_id;