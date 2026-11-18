
const SUPABASE_URL = 'https://eadrnuxaddgdnddkyqtq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZHJudXhhZGRnZG5kZGt5cXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0OTUxMDYsImV4cCI6MjExMDA3MTEwNn0.yMPmdEBAK9IKj9Sdv5pW9KQMQ6coEtvbm6Fvlnr0fU4';
const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('PASTE_') && SUPABASE_ANON_KEY.length > 30 && !SUPABASE_ANON_KEY.includes('PASTE_');
const db = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let profile = null, account = null, activePage = 'dashboard';
const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES'}).format(Number(n||0));
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function msg(el,text,error=false){el.innerHTML=`<div class="message ${error?'error':''}">${esc(text)}</div>`}
function requireConfig(){if(!db){alert('Connect Supabase first. Follow SETUP_GUIDE.md and add your Project URL and anon public key in app.js.');return false}return true}
function setTab(tab){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('#loginForm').classList.toggle('hidden',tab!=='login');$('#registerForm').classList.toggle('hidden',tab!=='register')}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!requireConfig())return;const f=new FormData(e.currentTarget);const {error}=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)msg($('#authMessage'),error.message,true);else await loadApp()});
$('#registerForm').addEventListener('submit',async e=>{e.preventDefault();if(!requireConfig())return;const f=new FormData(e.currentTarget);const {data,error}=await db.auth.signUp({email:f.get('email'),password:f.get('password'),options:{data:{full_name:f.get('full_name'),phone:f.get('phone')}}});if(error)msg($('#registerMessage'),error.message,true);else msg($('#registerMessage'),data.session?'Account created. You can now sign in.':'Registration received. Check your email to confirm, then sign in.')});
$('#logoutBtn').onclick=async()=>{await db.auth.signOut();profile=null;account=null;$('#appView').classList.add('hidden');$('#authView').classList.remove('hidden');$('#topUser').textContent=''};
document.querySelectorAll('.navbtn').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$('#adminLogoutBtn').onclick = async () => {
  await db.auth.signOut();
  profile = null;
  account = null;
  $('#adminView').classList.add('hidden');
  $('#appView').classList.add('hidden');
  $('#authView').classList.remove('hidden');
  $('#topUser').textContent = '';
};
async function loadApp() {
  if (!requireConfig()) return;

  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  const { data: p, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    alert('Could not load profile: ' + error.message);
    return;
  }

  profile = p;
  $('#authView').classList.add('hidden');
  $('#topUser').textContent = user.email;

  if (profile.role === 'admin') {
    $('#appView').classList.add('hidden');
    $('#adminView').classList.remove('hidden');
    adminShowPage('overview');
    return;
  }

  $('#adminView').classList.add('hidden');

  const { data: a, error: ae } = await db
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (ae) {
    alert('Account record not found. Run the Supabase SQL setup script.');
    return;
  }

  account = a;
  $('#appView').classList.remove('hidden');
  $('#welcomeName').textContent =
    Hello, ${profile.full_name || user.email}

  document.querySelectorAll('.admin-only')
    .forEach(x => x.classList.add('hidden'));

  await refreshNoticeCount();
  showPage('dashboard');
}
async function refreshData(){const {data:a}=await db.from('accounts').select('*').eq('user_id',profile.id).single();account=a;await refreshNoticeCount()}
async function refreshNoticeCount(){const {count}=await db.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',profile.id).eq('is_read',false);$('#noticeCount').textContent=count||0}
function showPage(page){activePage=page;document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));if(page==='dashboard')dashboard();if(page==='transactions')transactions();if(page==='notifications')notifications();if(page==='complaints')complaints();if(page==='profile')profilePage();if(page==='admin'&&profile.role==='admin')adminPage()}
async function dashboard(){await refreshData();const {data:tx}=await db.from('transactions').select('*').eq('user_id',profile.id).order('created_at',{ascending:false}).limit(5);$('#pageContent').innerHTML=`<div class="stats"><div class="stat"><span>Available simulated balance</span><strong>${money(account.balance)}</strong></div><div class="stat"><span>Account number</span><strong>${esc(account.account_number)}</strong></div><div class="stat"><span>Account status</span><strong><span class="badge">${esc(account.status)}</span></strong></div></div><div class="grid2"><div class="panel"><h2>Quick transaction</h2><form id="quickTx"><label>Transaction type<select name="kind"><option value="deposit">Deposit (simulation)</option><option value="withdrawal">Withdrawal (simulation)</option></select></label><label>Amount (KES)<input name="amount" type="number" min="1" step="0.01" required></label><label>Description<input name="description" maxlength="120" placeholder="e.g. Cash deposit"></label><button class="primary">Submit transaction</button><div id="txMessage"></div></form></div><div class="panel"><h2>Recent activity</h2>${tableTx(tx||[])}</div></div>`;const kind=$('#quickTx select[name=kind]');const recipient=$('#recipientField');kind.onchange=()=>{recipient.classList.toggle('hidden',kind.value!=='transfer');$('#quickTx input[name=recipient]').required=kind.value==='transfer'};$('#quickTx').onsubmit=runTransaction}
function tableTx(rows){if(!rows.length)return '<div class="empty">No transactions recorded yet.</div>';return `<div class="tablewrap"><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows.map(t=>`<tr><td>${new Date(t.created_at).toLocaleString()}</td><td>${esc(t.type)}</td><td>${money(t.amount)}</td><td><span class="badge">${esc(t.status)}</span></td></tr>`).join('')}</tbody></table></div>`}
async function runTransaction(e){e.preventDefault();const f=new FormData(e.currentTarget);const amount=Number(f.get('amount'));if(!Number.isFinite(amount)||amount<=0){msg($('#txMessage'),'Enter a valid amount.',true);return}const {data,error}=await db.rpc('post_demo_transaction',{p_type:f.get('kind'),p_amount:amount,p_description:f.get('description')||'Demo transaction',p_recipient_account:f.get('recipient')||null});if(error)msg($('#txMessage'),error.message,true);else{msg($('#txMessage'),'Transaction completed. Your simulated balance has been updated.');await dashboard()}}
async function transactions(){const {data,error}=await db.from('transactions').select('*').eq('user_id',profile.id).order('created_at',{ascending:false}).limit(100);$('#pageContent').innerHTML=`<div class="panel"><h2>Transaction history</h2>${error?esc(error.message):tableTx(data||[])}</div>`}
async function notifications(){const {data,error}=await db.from('notifications').select('*').eq('user_id',profile.id).order('created_at',{ascending:false}).limit(100);$('#pageContent').innerHTML=`<div class="panel"><h2>Account notifications</h2>${error?esc(error.message):!data?.length?'<div class="empty">No notifications yet.</div>':data.map(n=>`<div class="panel"><b>${esc(n.title)}</b><p>${esc(n.message)}</p><small class="muted">${new Date(n.created_at).toLocaleString()} • ${n.is_read?'Read':'Unread'}</small>${!n.is_read?` <button class="outline" data-read="${n.id}">Mark as read</button>`:''}</div>`).join('')}</div>`;document.querySelectorAll('[data-read]').forEach(b=>b.onclick=async()=>{await db.from('notifications').update({is_read:true}).eq('id',b.dataset.read);notifications();refreshNoticeCount()})}
async function complaints(){const {data}=await db.from('complaints').select('*').eq('user_id',profile.id).order('created_at',{ascending:false});$('#pageContent').innerHTML=`<div class="grid2"><div class="panel"><h2>Submit a complaint</h2><form id="complaintForm"><label>Subject<input name="subject" required maxlength="120"></label><label>Message<textarea name="message" required maxlength="2000"></textarea></label><button class="primary">Submit complaint</button><div id="complaintMsg"></div></form></div><div class="panel"><h2>My complaints</h2>${!data?.length?'<div class="empty">No complaints submitted.</div>':data.map(c=>`<p><b>${esc(c.subject)}</b><br><span class="muted">${esc(c.status)} • ${new Date(c.created_at).toLocaleDateString()}</span></p>`).join('')}</div></div>`;$('#complaintForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await db.from('complaints').insert({user_id:profile.id,subject:f.get('subject'),message:f.get('message')});if(error)msg($('#complaintMsg'),error.message,true);else{msg($('#complaintMsg'),'Complaint submitted.');complaints()}}}
function profilePage(){$('#pageContent').innerHTML=`<div class="panel"><h2>My profile</h2><p><b>Full name:</b> ${esc(profile.full_name)}</p><p><b>Email:</b> ${esc(profile.email)}</p><p><b>Phone:</b> ${esc(profile.phone||'Not provided')}</p><p><b>Role:</b> ${esc(profile.role)}</p><p><b>Account number:</b> ${esc(account.account_number)}</p><p class="muted">For account security, update your password through the authentication provider's password reset process.</p></div>`}
async function adminPage(){const {data:users}=await db.from('profiles').select('id,full_name,email,role,created_at').order('created_at',{ascending:false});const {data:allTx}=await db.from('transactions').select('*').order('created_at',{ascending:false}).limit(50);$('#pageContent').innerHTML=`<div class="panel"><h2>Administrator dashboard</h2><p class="muted">Manage demonstration users. Never use this system for real banking.</p><h3>Registered users</h3><div class="tablewrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead><tbody>${(users||[]).map(u=>`<tr><td>${esc(u.full_name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${u.role==='customer'?`<button class="outline" data-promote="${u.id}">Make admin</button>`:'Administrator'}</td></tr>`).join('')}</tbody></table></div></div><div class="panel"><h2>Latest system transactions</h2>${tableTx(allTx||[])}</div>`;document.querySelectorAll('[data-promote]').forEach(b=>b.onclick=async()=>{if(!confirm('Promote this user to administrator?'))return;const {error}=await db.from('profiles').update({role:'admin'}).eq('id',b.dataset.promote);if(error)alert(error.message);else adminPage()})}
if(configured){db.auth.getSession().then(({data})=>{if(data.session)loadApp()});db.auth.onAuthStateChange((_event,session)=>{if(!session){$('#appView').classList.add('hidden');$('#authView').classList.remove('hidden')}})}else{$('#authMessage').textContent='Setup required: connect your Supabase project using SETUP_GUIDE.md.'}
function adminShowPage(page) {
  const content = $('#adminContent');

  if (page === 'overview') {
    content.innerHTML = `
      <div class="panel">
        <h2>Admin Overview</h2>
        <p>Welcome to the RB Administration Control Centre.</p>
        <p>Manage customers, monitor transactions and review complaints.</p>
      </div>`;
  }

  if (page === 'users') {
    content.innerHTML = '<div class="panel"><h2>Customers</h2><p>Loading customers...</p></div>';

    db.from('profiles')
      .select('full_name,email,role,created_at')
      .eq('role', 'customer')
      .then(({ data, error }) => {
        if (error) {
          content.innerHTML = <div class="panel">Error: ${esc(error.message)}</div>;
          return;
        }

        content.innerHTML = `
          <div class="panel">
            <h2>Registered Customers</h2>
            <div class="tablewrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
                <tbody>
                  ${(data || []).map(u => `
                    <tr>
                      <td>${esc(u.full_name)}</td>
                      <td>${esc(u.email)}</td>
                      <td>${esc(u.role)}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
      });
  }

  if (page === 'transactions') {
    content.innerHTML = '<div class="panel"><h2>Transactions</h2><p>Loading...</p></div>';

    db.from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          content.innerHTML = <div class="panel">Error: ${esc(error.message)}</div>;
          return;
        }

        content.innerHTML = `
          <div class="panel">
            <h2>Recent Transactions</h2>
            ${tableTx(data || [])}
          </div>`;
      });
  }

  if (page === 'complaints') {
    content.innerHTML = '<div class="panel"><h2>Complaints</h2><p>Loading...</p></div>';

    db.from('complaints')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          content.innerHTML = <div class="panel">Error: ${esc(error.message)}</div>;
          return;
        }

        content.innerHTML = `
          <div class="panel">
            <h2>Customer Complaints</h2>
            <pre>${esc(JSON.stringify(data || [], null, 2))}</pre>
          </div>`;
      });
  }

  if (page === 'reports') {
    content.innerHTML = `
      <div class="panel">
        <h2>Reports</h2>
        <p>System reports will be displayed here.</p>
      </div>`;
  }
}
