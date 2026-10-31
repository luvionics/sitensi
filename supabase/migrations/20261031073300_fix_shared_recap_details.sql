create or replace function public.get_shared_recap(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_share recap_shares%rowtype;
  v_book books%rowtype;
  v_participant participants%rowtype;
  v_totals jsonb;
  v_participants jsonb := '[]'::jsonb;
  v_history jsonb := '[]'::jsonb;
  v_session_dates jsonb := '[]'::jsonb;
begin
  select *
  into v_share
  from public.recap_shares
  where token = p_token
    and enabled = true;

  if not found then
    return null;
  end if;

  select *
  into v_book
  from public.books
  where id = v_share.book_id;

  if v_share.participant_id is not null then
    select *
    into v_participant
    from public.participants
    where id = v_share.participant_id
      and book_id = v_share.book_id;

    if not found then
      return null;
    end if;

    select coalesce(jsonb_build_object(
      'hadir', count(*) filter (where status = 'hadir'),
      'izin', count(*) filter (where status = 'izin'),
      'alpha', count(*) filter (where status = 'alpha')
    ), '{"hadir":0,"izin":0,"alpha":0}'::jsonb)
    into v_totals
    from public.attendance
    where book_id = v_share.book_id
      and participant_id = v_participant.id
      and (v_share.date_from is null or tanggal >= v_share.date_from)
      and (v_share.date_to is null or tanggal <= v_share.date_to);

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'tanggal', to_char(tanggal, 'YYYY-MM-DD'),
        'status', status,
        'catatan', catatan
      ) order by tanggal desc
    ), '[]'::jsonb)
    into v_history
    from public.attendance
    where book_id = v_share.book_id
      and participant_id = v_participant.id
      and (v_share.date_from is null or tanggal >= v_share.date_from)
      and (v_share.date_to is null or tanggal <= v_share.date_to);

    select coalesce(jsonb_agg(distinct to_char(tanggal, 'YYYY-MM-DD') order by to_char(tanggal, 'YYYY-MM-DD') desc), '[]'::jsonb)
    into v_session_dates
    from public.attendance
    where book_id = v_share.book_id
      and (v_share.date_from is null or tanggal >= v_share.date_from)
      and (v_share.date_to is null or tanggal <= v_share.date_to);

    return jsonb_build_object(
      'book_name', v_book.name,
      'scope', 'participant',
      'participant_name', v_participant.name,
      'date_from', v_share.date_from,
      'date_to', v_share.date_to,
      'totals', v_totals,
      'history', v_history
      , 'session_dates', v_session_dates
    );
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'name', participant.name,
      'hadir', counts.hadir,
      'izin', counts.izin,
      'alpha', counts.alpha,
      'history', coalesce(history.records, '[]'::jsonb)
    ) order by participant.sort_order, participant.name
  ), '[]'::jsonb)
  into v_participants
  from public.participants participant
  left join lateral (
    select
      count(*) filter (where attendance.status = 'hadir') as hadir,
      count(*) filter (where attendance.status = 'izin') as izin,
      count(*) filter (where attendance.status = 'alpha') as alpha
    from public.attendance attendance
    where attendance.book_id = v_share.book_id
      and attendance.participant_id = participant.id
      and (v_share.date_from is null or attendance.tanggal >= v_share.date_from)
      and (v_share.date_to is null or attendance.tanggal <= v_share.date_to)
  ) counts on true
  left join lateral (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'tanggal', to_char(attendance.tanggal, 'YYYY-MM-DD'),
        'status', attendance.status,
        'catatan', attendance.catatan
      ) order by attendance.tanggal desc
    ), '[]'::jsonb) as records
    from public.attendance attendance
    where attendance.book_id = v_share.book_id
      and attendance.participant_id = participant.id
      and (v_share.date_from is null or attendance.tanggal >= v_share.date_from)
      and (v_share.date_to is null or attendance.tanggal <= v_share.date_to)
  ) history on true
  where participant.book_id = v_share.book_id;

  select jsonb_build_object(
    'hadir', coalesce(sum((participant->>'hadir')::integer), 0),
    'izin', coalesce(sum((participant->>'izin')::integer), 0),
    'alpha', coalesce(sum((participant->>'alpha')::integer), 0)
  )
  into v_totals
  from jsonb_array_elements(v_participants) participant;

  select coalesce(jsonb_agg(distinct to_char(tanggal, 'YYYY-MM-DD') order by to_char(tanggal, 'YYYY-MM-DD') desc), '[]'::jsonb)
  into v_session_dates
  from public.attendance
  where book_id = v_share.book_id
    and (v_share.date_from is null or tanggal >= v_share.date_from)
    and (v_share.date_to is null or tanggal <= v_share.date_to);

  return jsonb_build_object(
    'book_name', v_book.name,
    'scope', 'book',
    'date_from', v_share.date_from,
    'date_to', v_share.date_to,
    'totals', v_totals,
    'participants', v_participants
    , 'session_dates', v_session_dates
  );
end;
$$;

revoke all on function public.get_shared_recap(text) from public;
grant execute on function public.get_shared_recap(text) to anon, authenticated;
