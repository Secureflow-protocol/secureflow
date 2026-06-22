-- Local development seed data for Secureflow.
-- Run with: supabase db reset

insert into public.messages (
  conversation_id,
  sender_address,
  recipient_address,
  content,
  read_at,
  created_at
) values
  (
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'Hi, I reviewed your milestone proposal and have one follow-up question.',
    now(),
    now() - interval '2 hours'
  ),
  (
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'Thanks. I can provide the supporting file before the deadline.',
    null,
    now() - interval '90 minutes'
  )
on conflict do nothing;

insert into public.notifications (
  wallet_address,
  type,
  title,
  message,
  read_at,
  action_url,
  data,
  created_at
) values
  (
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'milestone',
    'Milestone ready for review',
    'A freelancer submitted milestone evidence for your project.',
    null,
    '/approvals',
    '{"escrowId":"local-escrow-001","milestone":1}'::jsonb,
    now() - interval '1 hour'
  ),
  (
    'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'application',
    'Application received',
    'Your application was delivered to the job creator.',
    now(),
    '/jobs',
    '{"jobId":"local-job-001"}'::jsonb,
    now() - interval '30 minutes'
  )
on conflict do nothing;
