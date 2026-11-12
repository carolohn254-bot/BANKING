-- Run this entire script once in Supabase Dashboard > SQL Editor.
-- Academic simulation only. Never connect real customer funds to this project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', email text not null unique,
  phone text, role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  account_number text not null unique,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  type text not null check (type in ('deposit','withdrawal','transfer_in','transfer_out')),
  amount numeric(14,2) not null check (amount > 0),
  description text,
  status text not null default 'completed', created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, message text not null, is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null, message text not null, status text not null default 'open',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare nm text; acc text;
begin
  nm := coalesce(new.raw_user_meta_data->>'full_name','New Customer');
  insert into public.profiles(id,full_name,email,phone) values(new.id,nm,new.email,new.raw_user_meta_data->>'phone');
  acc := 'MB' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.accounts(user_id,account_number) values(new.id,acc);
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.complaints enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;

-- Profiles: customers can view their own profile; admins can view/manage all profiles.
drop policy if exists "profile own or admin read" on public.profiles;
create policy "profile own or admin read" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Accounts are readable by owner/admin; balances can only be changed by the secure RPC below.
drop policy if exists "account own or admin read" on public.accounts;
create policy "account own or admin read" on public.accounts for select to authenticated using (user_id=auth.uid() or public.is_admin());

-- Customers see their own activity. Admins can inspect all records.
drop policy if exists "transactions own or admin read" on public.transactions;
create policy "transactions own or admin read" on public.transactions for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "notifications own or admin read" on public.notifications;
create policy "notifications own or admin read" on public.notifications for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "notifications owner mark read" on public.notifications;
create policy "notifications owner mark read" on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "complaints own or admin read" on public.complaints;
create policy "complaints own or admin read" on public.complaints for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists "complaints owner insert" on public.complaints;
create policy "complaints owner insert" on public.complaints for insert to authenticated with check(user_id=auth.uid());

-- Atomic simulated deposit, withdrawal and account-to-account transfer.
create or replace function public.post_demo_transaction(p_type text,p_amount numeric,p_description text default '',p_recipient_account text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.accounts%rowtype; recipient public.accounts%rowtype; new_balance numeric(14,2); recipient_balance numeric(14,2);
begin
 if auth.uid() is null then raise exception 'Please sign in first'; end if;
 if p_type not in ('deposit','withdrawal','transfer') then raise exception 'Unsupported transaction type'; end if;
 if p_amount is null or p_amount <= 0 or p_amount > 1000000 then raise exception 'Enter an amount between 0.01 and 1,000,000'; end if;
 select * into a from public.accounts where user_id=auth.uid() for update;
 if not found then raise exception 'Account not found'; end if;
 if a.status <> 'active' then raise exception 'This account is not active'; end if;
 if p_type='transfer' then
   if p_recipient_account is null or length(trim(p_recipient_account))=0 then raise exception 'Enter the recipient account number'; end if;
   select * into recipient from public.accounts where account_number=trim(p_recipient_account) for update;
   if not found then raise exception 'Recipient account number was not found'; end if;
   if recipient.id=a.id then raise exception 'You cannot transfer to your own account'; end if;
   if recipient.status <> 'active' then raise exception 'Recipient account is not active'; end if;
 end if;
 if p_type in ('withdrawal','transfer') and a.balance < p_amount then raise exception 'Insufficient simulated balance'; end if;
 if p_type='deposit' then
   new_balance:=a.balance+p_amount;
 elsif p_type='withdrawal' then
   new_balance:=a.balance-p_amount;
 else
   new_balance:=a.balance-p_amount; recipient_balance:=recipient.balance+p_amount;
   update public.accounts set balance=recipient_balance where id=recipient.id;
   insert into public.transactions(user_id,account_id,type,amount,description) values(recipient.user_id,recipient.id,'transfer_in',p_amount,'Transfer received from '||a.account_number);
   insert into public.notifications(user_id,title,message) values(recipient.user_id,'Transfer received','A simulated transfer of KES '||to_char(p_amount,'FM999,999,990.00')||' was received.');
 end if;
 update public.accounts set balance=new_balance where id=a.id;
 insert into public.transactions(user_id,account_id,type,amount,description) values(auth.uid(),a.id,case when p_type='transfer' then 'transfer_out' else p_type end,p_amount,coalesce(p_description,'')||case when p_type='transfer' then ' to '||recipient.account_number else '' end);
 insert into public.notifications(user_id,title,message) values(auth.uid(),'Transaction completed',initcap(p_type)||' of KES '||to_char(p_amount,'FM999,999,990.00')||' completed. New simulated balance: KES '||to_char(new_balance,'FM999,999,990.00'));
 return jsonb_build_object('balance',new_balance);
end; $$;
revoke all on function public.post_demo_transaction(text,numeric,text,text) from public;
grant execute on function public.post_demo_transaction(text,numeric,text,text) to authenticated;
