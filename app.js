(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const config = window.SITE_CONFIG || {};
  const configured = config.supabaseUrl && config.supabaseAnonKey &&
    !config.supabaseUrl.includes("PASTE_") && !config.supabaseAnonKey.includes("PASTE_") &&
    window.supabase;
  const db = configured ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
  const year = $("#year"); if (year) year.textContent = new Date().getFullYear();
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const excerpt = (s,n=180) => String(s || "").length > n ? String(s).slice(0,n).trim()+"…" : String(s || "");
  const dateLabel = s => s ? new Date(s).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "";
  function card(a) { return `<article class="article-card"><p class="eyebrow">${esc(a.author_name || "Miles Kelly")} · ${esc(dateLabel(a.published_at))}</p><h3><a href="article.html?id=${encodeURIComponent(a.id)}">${esc(a.title)}</a></h3><p>${esc(a.summary || excerpt(a.body))}</p><a class="text-link" href="article.html?id=${encodeURIComponent(a.id)}">Read article ↗</a></article>`; }
  async function loadArticles(target, limit) {
    if (!db || !target) return;
    const {data,error} = await db.from("articles").select("id,title,summary,body,author_name,published_at").eq("status","published").order("published_at",{ascending:false}).limit(limit || 100);
    if (error) { target.innerHTML = `<p class="muted">Could not load articles. Check the setup in README.md.</p>`; return; }
    target.innerHTML = data.length ? data.map(card).join("") : `<article class="article-card placeholder"><h3>No articles published yet.</h3><p>Check back soon.</p></article>`;
  }
  loadArticles($("#latest-articles"),3); loadArticles($("#all-articles"));
  async function loadAbout() {
    const el=$("#about-content"); if(!db || !el) return;
    const {data} = await db.from("site_content").select("content").eq("key","about").maybeSingle();
    if(data?.content) el.textContent=data.content;
  } loadAbout();
  async function loadArticle() {
    const root=$("#article-detail"); if(!root || !db) return;
    const id=new URLSearchParams(location.search).get("id"); if(!id){root.innerHTML='<p class="muted">Choose an article from the Articles page.</p>';return;}
    const {data,error}=await db.from("articles").select("title,body,author_name,published_at").eq("id",id).eq("status","published").maybeSingle();
    if(error||!data){root.innerHTML='<p class="muted">Article not found.</p>';return;}
    document.title=data.title+" — Miles Kelly";
    root.innerHTML=`<p class="eyebrow">${esc(data.author_name)} · ${esc(dateLabel(data.published_at))}</p><h1 class="page-title">${esc(data.title)}</h1><div class="article-body">${esc(data.body).split(/\n{2,}/).map(p=>`<p>${p.replace(/\n/g,"<br>")}</p>`).join("")}</div>`;
  } loadArticle();
  const subForm=$("#submission-form");
  if(subForm) subForm.addEventListener("submit",async e=>{
    e.preventDefault(); const status=$("#submission-status");
    if(!db){status.textContent="Setup needed: follow README.md to connect the database before accepting submissions.";return;}
    const f=new FormData(subForm); status.textContent="Sending…";
    const {error}=await db.from("submissions").insert({author_name:f.get("author").trim(),email:f.get("email").trim(),title:f.get("title").trim(),body:f.get("body").trim()});
    status.textContent=error?"Couldn't submit. Please check the setup and try again.":"Thanks — your article has been sent to Miles for review.";
    if(!error) subForm.reset();
  });
  const loginForm=$("#login-form"), dashboard=$("#admin-dashboard"), loginSection=$("#admin-login-section");
  const adminStatus=$("#admin-status"), dashStatus=$("#dashboard-status");
  async function refreshAdmin() {
    if(!db) return;
    const {data:{user}}=await db.auth.getUser();
    if(user) {
      const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
      const isAdmin=profile?.role==="admin";
      if(loginSection) loginSection.hidden=isAdmin;
      if(dashboard) dashboard.hidden=!isAdmin;
      if(!isAdmin && adminStatus) adminStatus.textContent="This account isn't an admin. Sign in with the account authorized by the site owner.";
      if(isAdmin) await loadDashboard();
    }
  }
  if(loginForm) loginForm.addEventListener("submit",async e=>{
    e.preventDefault(); if(!db){adminStatus.textContent="Setup needed: follow README.md to connect Supabase.";return;}
    const f=new FormData(loginForm); adminStatus.textContent="Signing in…";
    const {error}=await db.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});
    if(error){adminStatus.textContent="Sign-in failed. Check your email and password.";return;}
    await refreshAdmin();
  });
  const logout=$("#logout-button"); if(logout) logout.addEventListener("click",async()=>{await db?.auth.signOut(); if(dashboard) dashboard.hidden=true;if(loginSection)loginSection.hidden=false;});
  async function loadDashboard() {
    if(!db) return;
    const {data:about}=await db.from("site_content").select("content").eq("key","about").maybeSingle();
    const af=$("#about-form"); if(af) af.elements.content.value=about?.content||"";
    const {data:subs,error}=await db.from("submissions").select("id,author_name,email,title,body,created_at").eq("status","pending").order("created_at",{ascending:true});
    const list=$("#submissions-list");
    if(list) list.innerHTML=error?"Couldn't load submissions.":(subs?.length?subs.map(s=>`<article class="submission" data-id="${esc(s.id)}"><p class="eyebrow">${esc(s.author_name)} · ${esc(s.email)}</p><h4>${esc(s.title)}</h4><p class="submission-body">${esc(s.body)}</p><div class="inline-actions"><button class="button approve" data-id="${esc(s.id)}">Approve & publish</button><button class="button button-outline reject" data-id="${esc(s.id)}">Reject</button></div></article>`).join(""):"No pending submissions.");
  }
  const aboutForm=$("#about-form"); if(aboutForm) aboutForm.addEventListener("submit",async e=>{
    e.preventDefault(); if(!db)return; dashStatus.textContent="Saving…";
    const {error}=await db.from("site_content").upsert({key:"about",content:aboutForm.elements.content.value.trim(),updated_at:new Date().toISOString()});
    dashStatus.textContent=error?"Save failed. Check database policies.":"About page saved.";
  });
  const articleForm=$("#article-form"); if(articleForm) articleForm.addEventListener("submit",async e=>{
    e.preventDefault(); if(!db)return; dashStatus.textContent="Publishing…";
    const f=new FormData(articleForm), {data:{user}}=await db.auth.getUser();
    const {error}=await db.from("articles").insert({title:f.get("title").trim(),summary:f.get("summary").trim(),body:f.get("body").trim(),author_name:"Miles Kelly",author_id:user.id,status:"published",published_at:new Date().toISOString()});
    dashStatus.textContent=error?"Publish failed. Check database policies.":"Article published."; if(!error){articleForm.reset();await loadArticles($("#latest-articles"),3);await loadArticles($("#all-articles"));}
  });
  const subsList=$("#submissions-list"); if(subsList) subsList.addEventListener("click",async e=>{
    const b=e.target.closest("button[data-id]"); if(!b||!db)return;
    const id=b.dataset.id;
    if(b.classList.contains("approve")){
      const {data:s}=await db.from("submissions").select("*").eq("id",id).single();
      if(!s){dashStatus.textContent="Could not load submission.";return;}
      const {data:{user}}=await db.auth.getUser();
      const {error}=await db.from("articles").insert({title:s.title,body:s.body,summary:excerpt(s.body,180),author_name:s.author_name,author_id:user.id,status:"published",published_at:new Date().toISOString()});
      if(error){dashStatus.textContent="Could not publish submission.";return;}
      await db.from("submissions").update({status:"approved"}).eq("id",id);
    } else {
      await db.from("submissions").update({status:"rejected"}).eq("id",id);
    }
    dashStatus.textContent="Submission updated."; await loadDashboard();
  });
  if(db) refreshAdmin();
})();