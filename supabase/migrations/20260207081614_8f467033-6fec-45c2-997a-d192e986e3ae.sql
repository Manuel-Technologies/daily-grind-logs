-- Allow long-form posts by expanding the logs content length constraint
ALTER TABLE public.logs
  DROP CONSTRAINT IF EXISTS logs_content_check;

ALTER TABLE public.logs
  ADD CONSTRAINT logs_content_check
  CHECK (char_length(content) <= 50000);