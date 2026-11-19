-- Sprint 3.1: RLS is not enforced for TRUNCATE operations.
-- Harden existing public schema tables after the initial three migrations.
-- Do not grant schema-wide TRUNCATE, TRIGGER or REFERENCES to API roles.
revoke truncate, trigger, references
  on all tables in schema public
  from public, anon, authenticated;
