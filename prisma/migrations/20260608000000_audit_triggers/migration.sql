-- Adiciona triggers nativos no PostgreSQL para auditoria

-- Função genérica de auditoria chamada pelos triggers
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_acao TEXT;
  v_usuario_id INT;
  v_registro_id INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'INSERT';
    v_registro_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'UPDATE';
    v_registro_id := NEW.id;
  ELSE
    v_acao := 'DELETE';
    v_registro_id := OLD.id;
  END IF;

  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_usuario_id := OLD.usuario_id;
    ELSE
      v_usuario_id := NEW.usuario_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_usuario_id := NULL;
  END;

  INSERT INTO logs (usuario_id, acao, tabela_afetada, registro_id, criado_em)
  VALUES (v_usuario_id, v_acao, TG_TABLE_NAME, v_registro_id, NOW());

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: assinaturas
DROP TRIGGER IF EXISTS trg_audit_assinaturas ON assinaturas;
CREATE TRIGGER trg_audit_assinaturas
  AFTER INSERT OR UPDATE OR DELETE ON assinaturas
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Trigger: pagamentos
DROP TRIGGER IF EXISTS trg_audit_pagamentos ON pagamentos;
CREATE TRIGGER trg_audit_pagamentos
  AFTER INSERT OR UPDATE OR DELETE ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Trigger: categorias (apenas personalizadas)
CREATE OR REPLACE FUNCTION fn_audit_log_categorias()
RETURNS TRIGGER AS $$
DECLARE
  v_acao TEXT;
  v_usuario_id INT;
  v_registro_id INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'INSERT'; v_registro_id := NEW.id; v_usuario_id := NEW.usuario_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'UPDATE'; v_registro_id := NEW.id; v_usuario_id := NEW.usuario_id;
  ELSE
    v_acao := 'DELETE'; v_registro_id := OLD.id; v_usuario_id := OLD.usuario_id;
  END IF;

  IF v_usuario_id IS NOT NULL THEN
    INSERT INTO logs (usuario_id, acao, tabela_afetada, registro_id, criado_em)
    VALUES (v_usuario_id, v_acao, 'categorias', v_registro_id, NOW());
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_categorias ON categorias;
CREATE TRIGGER trg_audit_categorias
  AFTER INSERT OR UPDATE OR DELETE ON categorias
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_categorias();

-- Trigger: sugestoes_economia
DROP TRIGGER IF EXISTS trg_audit_sugestoes ON sugestoes_economia;
CREATE TRIGGER trg_audit_sugestoes
  AFTER INSERT OR UPDATE OR DELETE ON sugestoes_economia
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
