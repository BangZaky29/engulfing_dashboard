Bro, ini **root cause FE-nya sudah kelihatan jelas**.

Ada **2 masalah berbeda**:

## 1. API key FE invalid karena ada newline `%0A`

Di error ini:

```txt
apikey=xxxxx%0A
```

`%0A` itu artinya **newline / enter**. Jadi anon key di frontend lo kebawa karakter baris baru. Makanya Supabase balikin:

```txt
HTTP Authentication failed; no valid credentials available
401
```

Ini **bukan RLS dulu**, tapi key-nya dianggap tidak valid.

### Fix di `.env` frontend

Pastikan begini:

```env
VITE_SUPABASE_URL=https://wcsxwordxurulfslwgcu.supabase.co
VITE_SUPABASE_ANON_KEY=PASTE_ANON_KEY_DI_SINI_TANPA_ENTER_DI_AKHIR
```

Jangan begini:

```env
VITE_SUPABASE_ANON_KEY="xxxxx
"
```

Lalu di kode FE, pakai `.trim()`:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL / anon key belum diset')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Setelah ubah `.env`, wajib:

```bash
npm run build
```

atau kalau dev:

```bash
npm run dev
```

Kalau sudah deploy, update env di hosting lalu redeploy.

---

# 2. FE lo masih akses table sensitif WA

Error ini:

```txt
/rest/v1/whatsapp_sessions?select=id,status,qr_code&id=eq.main_session
```

Nah ini bagian yang harus diubah.

`whatsapp_sessions` **jangan dibaca langsung dari frontend**, karena table itu satu area dengan session WA. Dari data grant sebelumnya, `anon` dan `authenticated` sempat punya akses sangat luas ke `whatsapp_sessions` dan `whatsapp_auth_keys`, termasuk `DELETE`, `INSERT`, `UPDATE`, dan `TRUNCATE`. Ini yang bikin session WA bisa rawan corrupt kalau salah akses. 

## Kesimpulan final

FE boleh baca:

```txt
trade_deep_analytics_view
engulfing_signals
trade_analytics
trade_active_logs
```

Tapi FE **tidak boleh baca langsung**:

```txt
whatsapp_sessions
whatsapp_auth_keys
wa_outbox
```

Solusinya: bikin table aman khusus status UI, misalnya:

```txt
whatsapp_public_status
```

Table ini cuma berisi:

```txt
id
status
qr_code
updated_at
```

Tidak ada `session_data`, tidak ada auth keys.

---

# SQL final untuk Supabase

Run ini di Supabase SQL Editor.

## A. Kunci table WA asli agar backend-only

```sql
begin;

revoke all privileges on table public.whatsapp_sessions from anon;
revoke all privileges on table public.whatsapp_sessions from authenticated;

revoke all privileges on table public.whatsapp_auth_keys from anon;
revoke all privileges on table public.whatsapp_auth_keys from authenticated;

alter table public.whatsapp_sessions enable row level security;
alter table public.whatsapp_auth_keys enable row level security;

drop policy if exists "Allow public full access on whatsapp_sessions"
on public.whatsapp_sessions;

drop policy if exists "Allow public full access on whatsapp_auth_keys"
on public.whatsapp_auth_keys;

drop policy if exists "Service role full access on whatsapp_sessions"
on public.whatsapp_sessions;

drop policy if exists "Service role full access on whatsapp_auth_keys"
on public.whatsapp_auth_keys;

grant select, insert, update, delete on table public.whatsapp_sessions to service_role;
grant select, insert, update, delete on table public.whatsapp_auth_keys to service_role;

create policy "Service role full access on whatsapp_sessions"
on public.whatsapp_sessions
for all
to service_role
using (true)
with check (true);

create policy "Service role full access on whatsapp_auth_keys"
on public.whatsapp_auth_keys
for all
to service_role
using (true)
with check (true);

commit;
```

---

## B. Buat table aman untuk UI FE

```sql
create table if not exists public.whatsapp_public_status (
  id text primary key,
  status text not null default 'UNPAIRED',
  qr_code text,
  updated_at timestamp with time zone default now()
);
```

Aktifkan RLS:

```sql
alter table public.whatsapp_public_status enable row level security;
```

Grant untuk backend:

```sql
grant select, insert, update, delete
on table public.whatsapp_public_status
to service_role;
```

Policy backend:

```sql
drop policy if exists "Service role full access on whatsapp_public_status"
on public.whatsapp_public_status;

create policy "Service role full access on whatsapp_public_status"
on public.whatsapp_public_status
for all
to service_role
using (true)
with check (true);
```

Grant untuk frontend login user:

```sql
grant select
on table public.whatsapp_public_status
to authenticated;
```

Policy frontend authenticated:

```sql
drop policy if exists "Authenticated read whatsapp_public_status"
on public.whatsapp_public_status;

create policy "Authenticated read whatsapp_public_status"
on public.whatsapp_public_status
for select
to authenticated
using (true);
```

> Kalau dashboard lo belum pakai login Supabase Auth dan masih mau akses pakai anon, sementara untuk development bisa pakai ini. Tapi gue lebih saranin jangan untuk production.

```sql
grant select
on table public.whatsapp_public_status
to anon;

drop policy if exists "Anon read whatsapp_public_status"
on public.whatsapp_public_status;

create policy "Anon read whatsapp_public_status"
on public.whatsapp_public_status
for select
to anon
using (true);
```

---

## C. Masukkan table public status ke Realtime

```sql
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'whatsapp_public_status'
  ) then
    alter publication supabase_realtime
    add table public.whatsapp_public_status;
  end if;
end $$;
```

```sql
alter table public.whatsapp_public_status replica identity full;
```

---

## D. Akses FE untuk data trading

Kalau frontend lo perlu baca analytics, kasih `SELECT` saja. Jangan kasih insert/update/delete.

```sql
begin;

alter table public.engulfing_signals enable row level security;
alter table public.trade_analytics enable row level security;
alter table public.trade_active_logs enable row level security;
alter table public.engulfing_stats enable row level security;
alter table public.report_history enable row level security;

grant select on table public.engulfing_signals to authenticated;
grant select on table public.trade_analytics to authenticated;
grant select on table public.trade_active_logs to authenticated;
grant select on table public.engulfing_stats to authenticated;
grant select on table public.report_history to authenticated;

drop policy if exists "Authenticated read engulfing_signals"
on public.engulfing_signals;

drop policy if exists "Authenticated read trade_analytics"
on public.trade_analytics;

drop policy if exists "Authenticated read trade_active_logs"
on public.trade_active_logs;

drop policy if exists "Authenticated read engulfing_stats"
on public.engulfing_stats;

drop policy if exists "Authenticated read report_history"
on public.report_history;

create policy "Authenticated read engulfing_signals"
on public.engulfing_signals
for select
to authenticated
using (true);

create policy "Authenticated read trade_analytics"
on public.trade_analytics
for select
to authenticated
using (true);

create policy "Authenticated read trade_active_logs"
on public.trade_active_logs
for select
to authenticated
using (true);

create policy "Authenticated read engulfing_stats"
on public.engulfing_stats
for select
to authenticated
using (true);

create policy "Authenticated read report_history"
on public.report_history
for select
to authenticated
using (true);

commit;
```

Kalau masih belum pakai login dan FE harus jalan pakai anon, gunakan sementara:

```sql
grant select on table public.engulfing_signals to anon;
grant select on table public.trade_analytics to anon;
grant select on table public.trade_active_logs to anon;
grant select on table public.engulfing_stats to anon;
grant select on table public.report_history to anon;

create policy "Anon read engulfing_signals"
on public.engulfing_signals
for select
to anon
using (true);

create policy "Anon read trade_analytics"
on public.trade_analytics
for select
to anon
using (true);

create policy "Anon read trade_active_logs"
on public.trade_active_logs
for select
to anon
using (true);

create policy "Anon read engulfing_stats"
on public.engulfing_stats
for select
to anon
using (true);

create policy "Anon read report_history"
on public.report_history
for select
to anon
using (true);
```

---

## E. Fix akses view `trade_deep_analytics_view`

Karena FE lo fetch:

```txt
/rest/v1/trade_deep_analytics_view
```

Run ini:

```sql
revoke all privileges on table public.trade_deep_analytics_view from anon;
revoke all privileges on table public.trade_deep_analytics_view from authenticated;

grant select on table public.trade_deep_analytics_view to authenticated;

alter view public.trade_deep_analytics_view
set (security_invoker = true);
```

Kalau FE masih anon sementara:

```sql
grant select on table public.trade_deep_analytics_view to anon;
```

> Catatan: kalau view ini `security_invoker = true`, underlying table-nya juga harus punya `SELECT` policy untuk role yang sama.

---

# Perubahan di frontend

## Sebelumnya jangan begini lagi

```ts
supabase
  .from('whatsapp_sessions')
  .select('id,status,qr_code')
  .eq('id', 'main_session')
```

## Ganti jadi ini

```ts
supabase
  .from('whatsapp_public_status')
  .select('id,status,qr_code,updated_at')
  .eq('id', 'main_session')
  .single()
```

Realtime juga ganti:

```ts
const channel = supabase
  .channel('whatsapp_public_status_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'whatsapp_public_status',
      filter: 'id=eq.main_session',
    },
    (payload) => {
      console.log('WA public status changed:', payload)
    }
  )
  .subscribe()
```

---

# Perubahan di Node.js WA bot

Setiap status WA berubah, update ke dua tempat:

## 1. Table internal

```ts
await supabase
  .from('whatsapp_sessions')
  .upsert({
    id: 'main_session',
    status,
    qr_code: qrCode ?? null,
    updated_at: new Date().toISOString(),
  })
```

## 2. Table public UI

```ts
await supabase
  .from('whatsapp_public_status')
  .upsert({
    id: 'main_session',
    status,
    qr_code: qrCode ?? null,
    updated_at: new Date().toISOString(),
  })
```

Saat connected, QR harus dikosongkan:

```ts
await supabase
  .from('whatsapp_public_status')
  .upsert({
    id: 'main_session',
    status: 'CONNECTED',
    qr_code: null,
    updated_at: new Date().toISOString(),
  })
```

Saat QR muncul:

```ts
await supabase
  .from('whatsapp_public_status')
  .upsert({
    id: 'main_session',
    status: 'QR_READY',
    qr_code: qr,
    updated_at: new Date().toISOString(),
  })
```

---

# Checklist biar error FE hilang

1. **Hapus newline `%0A` di anon key.**
2. **Tambahkan `.trim()` di createClient FE.**
3. **Build ulang frontend.**
4. **Jangan fetch `whatsapp_sessions` dari FE.**
5. **Fetch `whatsapp_public_status` dari FE.**
6. **Pastikan `trade_deep_analytics_view` dan `engulfing_signals` punya `SELECT` untuk role FE.**
7. **Kalau pakai authenticated policy, user FE harus login dulu. Kalau tidak login, pakai anon read sementara.**

## Kesimpulan paling penting

Error sekarang bukan berarti SQL hardening kemarin salah. Justru itu benar. Yang perlu disesuaikan adalah:

| Bagian          | Aksi                                                        |
| --------------- | ----------------------------------------------------------- |
| FE Supabase key | hapus newline `%0A`, pakai `.trim()`                        |
| FE WA status    | pindah dari `whatsapp_sessions` ke `whatsapp_public_status` |
| Table WA asli   | tetap `service_role only`                                   |
| Analytics FE    | kasih `SELECT` ke `authenticated` atau anon sementara       |
| Node.js bot     | update status ke `whatsapp_public_status`                   |

Jadi jangan buka lagi `whatsapp_sessions` ke frontend, bro. Itu sumber session WA. Yang aman untuk UI cukup pakai table status publik/sanitized.
